// Mobile API test (MOBILE_PLAN.md M2): every /api/v1 route, signed out, by role,
// and across families.
//
//   pnpm dev --port 3141            (in another terminal)
//   pnpm api:test http://localhost:3141
//
// Creates four QA accounts (lanternway-qa+api-…@example.com) through the API's own
// sign-up, marks them verified with admin SQL, and deletes them again at the end:
//   A  admin of family A (one child, a record of every kind)
//   L  "can log" member of family A      V  "can view" member of family A
//   B  admin of family B (one child), a stranger to family A
// All names and details are made up.
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";

const base = process.argv[2] ?? "http://localhost:3141";
const admin = new Pool({ connectionString: process.env.DATABASE_URL_ADMIN });
const stamp = Date.now().toString(36);
const PREFIX = `lanternway-qa+api-${stamp}`;
const tz = "America/Chicago";

let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
  ok ? passed++ : failed++;
  if (!ok || process.env.VERBOSE) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== "" ? `  (${detail})` : ""}`);
};

let retries = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(method, path, { token, body } = {}) {
  let res;
  // 503 means Neon Auth is rate-limiting the session checks: wait and retry, as the app will.
  for (let attempt = 0; ; attempt++) {
    res = await fetch(base + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status !== 503 || attempt === 8) break;
    retries++;
    await sleep(Number(res.headers.get("retry-after") ?? 10) * 1000);
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, setCookie: res.headers.getSetCookie() };
}

const people = {};
function person(key) {
  return { key, name: `QA ${key}`, email: `${PREFIX}-${key.toLowerCase()}@example.com`, password: `Qa-${randomBytes(9).toString("base64url")}` };
}
const consents = { adult: true, terms: true, healthData: true, testing: true };

async function cleanUp() {
  const { rows } = await admin.query(`select id::text as id from neon_auth."user" where email like $1`, [`${PREFIX}-%`]);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    // Only families whose members are all QA accounts from this run.
    await admin.query(
      `delete from families f where exists (select 1 from family_members m where m.family_id = f.id and m.user_id = any($1::text[]))
         and not exists (select 1 from family_members m where m.family_id = f.id and m.user_id <> all($1::text[]))`,
      [ids],
    );
    await admin.query(`delete from consents where user_id = any($1::text[])`, [ids]);
    await admin.query(`delete from neon_auth."user" where id::text = any($1::text[])`, [ids]);
  }
  const left = await admin.query(`select count(*)::int as n from neon_auth."user" where email like $1`, [`${PREFIX}-%`]);
  console.log(`\nCleaned up ${ids.length} QA account(s); ${left.rows[0].n} left.`);
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysAgo = (n) => new Date(Date.parse(`${today}T12:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

try {
  // ---------------------------------------------------------------- accounts
  for (const key of ["A", "L", "V", "B"]) people[key] = person(key);

  let r = await api("POST", "/api/v1/auth/sign-up", { body: { name: "QA X", email: `${PREFIX}-x@example.com`, password: people.A.password } });
  check("sign-up without the consent boxes → 400", r.status === 400, r.json?.error);
  r = await api("POST", "/api/v1/auth/sign-up", { body: { name: "QA X", email: `${PREFIX}-x@example.com`, password: "short", consents } });
  check("sign-up with a weak password → 400", r.status === 400, r.json?.error);
  for (const p of Object.values(people)) {
    r = await api("POST", "/api/v1/auth/sign-up", { body: { name: p.name, email: p.email, password: p.password, consents } });
    check(`sign-up ${p.key} → needs_verification`, r.status === 200 && r.json?.status === "needs_verification", r.status);
  }
  const consentRows = await admin.query(
    `select count(*)::int as n from consents c join neon_auth."user" u on u.id::text = c.user_id where u.email = $1`, [people.A.email]);
  check("sign-up records the 5 consents", consentRows.rows[0].n === 5, consentRows.rows[0].n);

  r = await api("POST", "/api/v1/auth/sign-in", { body: { email: people.A.email, password: people.A.password } });
  check("sign-in before verifying → 403 needs_verification", r.status === 403 && r.json?.error === "needs_verification", r.status);
  r = await api("POST", "/api/v1/auth/verify-email", { body: { email: people.A.email, code: "000000" } });
  check("verify-email with a wrong code → 400", r.status === 400, r.json?.error);
  r = await api("POST", "/api/v1/auth/resend-code", { body: { email: people.A.email } });
  check("resend-code → 200 (or 429 if Neon rate-limits)", r.status === 200 || r.status === 429, r.status);
  r = await api("POST", "/api/v1/auth/forgot-password", { body: { email: `${PREFIX}-nobody@example.com` } });
  check("forgot-password answers the same for an unknown email → 200", r.status === 200, r.status);

  await admin.query(`update neon_auth."user" set "emailVerified" = true where email like $1`, [`${PREFIX}-%`]);
  for (const p of Object.values(people)) {
    r = await api("POST", "/api/v1/auth/sign-in", { body: { email: p.email, password: p.password } });
    p.token = r.json?.token;
    p.id = r.json?.user?.id;
    check(`sign-in ${p.key} → token, no cookies`, r.status === 200 && !!p.token && r.setCookie.length === 0, r.status);
  }
  const { A, L, V, B } = people;

  // ---------------------------------------------------------------- children
  r = await api("POST", "/api/v1/children?tz=" + tz, { token: A.token, body: { firstName: "Wren", birthDate: "2017-03-09", communicationStyle: "speaking" } });
  const childA = r.json?.id;
  check("A adds a child → id", r.status === 200 && !!childA, r.status);
  r = await api("POST", "/api/v1/children?tz=" + tz, { token: B.token, body: { firstName: "Otto", birthDate: "2019-08-21" } });
  const childB = r.json?.id;
  check("B adds a child → id", r.status === 200 && !!childB, r.status);
  r = await api("POST", "/api/v1/children", { token: A.token, body: { firstName: "", birthDate: "2017-03-09" } });
  check("add a child without a name → 400", r.status === 400, r.json?.error);

  r = await api("GET", "/api/v1/me", { token: A.token });
  const familyA = r.json?.families?.[0]?.id;
  check("A /me lists the family and the child as admin", r.status === 200 && r.json.children?.[0]?.child?.id === childA && r.json.children[0].role === "admin" && !!familyA);
  r = await api("GET", "/api/v1/me", { token: B.token });
  const familyB = r.json?.families?.[0]?.id;
  check("B /me doesn't include A's child", r.status === 200 && !r.text.includes(childA));

  // ---------------------------------------------------------------- family invites
  r = await api("POST", `/api/v1/families/${familyA}/invites`, { token: A.token, body: { label: "QA L", role: "log", days: 7 } });
  check("invite without consent → 400", r.status === 400, r.json?.error);
  const inviteL = (await api("POST", `/api/v1/families/${familyA}/invites`, { token: A.token, body: { label: "QA L", role: "log", days: 7, consent: true } })).json?.token;
  const inviteV = (await api("POST", `/api/v1/families/${familyA}/invites`, { token: A.token, body: { label: "QA V", role: "view", days: 30, consent: true } })).json?.token;
  const spare = await api("POST", `/api/v1/families/${familyA}/invites`, { token: A.token, body: { label: "QA spare", role: "view", days: 7, consent: true } });
  check("invites return a 43-character token", [inviteL, inviteV, spare.json?.token].every((t) => /^[A-Za-z0-9_-]{43}$/.test(t ?? "")));
  r = await api("GET", "/api/v1/families", { token: A.token });
  const invites = r.json?.families?.find((f) => f.id === familyA)?.invites ?? [];
  check("invite tokens are shown once: never in GET /families", invites.length === 3 && ![inviteL, inviteV, spare.json?.token].some((t) => r.text.includes(t)));
  const spareId = invites.find((i) => i.label === "QA spare")?.id;

  r = await api("POST", `/api/v1/join/${inviteL}`, { token: L.token });
  check("L joins family A", r.status === 200 && r.json?.status === "joined" && r.json.childId === childA, r.status);
  r = await api("POST", `/api/v1/join/${inviteV}`, { token: V.token });
  check("V joins family A", r.status === 200 && r.json?.status === "joined", r.status);
  r = await api("POST", `/api/v1/join/${inviteL}`, { token: B.token });
  check("a used invite can't be used again → 409", r.status === 409, r.status);
  r = await api("GET", "/api/v1/me", { token: V.token });
  check("V /me shows A's child with role view", r.json?.children?.some((c) => c.child.id === childA && c.role === "view"));

  // ---------------------------------------------------------------- records (A, admin)
  const ids = Object.fromEntries(
    ["log", "log2", "milestone", "med", "change", "reminder", "provider", "goal", "session", "plan", "iepGoal", "support", "message"].map((k) => [k, randomUUID()]),
  );
  const records = [
    ["logs", ids.log, { childId: childA, date: today, kind: "mood", rating: 4, note: "Calm morning" }],
    ["milestones", ids.milestone, { childId: childA, date: daysAgo(10), category: "life", title: "Rode a bike" }],
    ["medications", ids.med, { childId: childA, name: "Test medication", startDate: daysAgo(40), lastFilledOn: daysAgo(20), daysSupply: 30 }],
    ["medicationChanges", ids.change, { medicationId: ids.med, date: daysAgo(40), type: "start", doseMg: 1, schedule: "Once daily, morning" }],
    ["medicationReminders", ids.reminder, { medicationId: ids.med, times: ["08:00"], days: "every-day", channel: "push", wording: "private", status: "active", timeZone: tz }],
    ["providers", ids.provider, { childId: childA, type: "speech", name: "Pat Example", startDate: daysAgo(90), schedule: "Tuesdays 4pm" }],
    ["therapyGoals", ids.goal, { providerId: ids.provider, title: "Two-step directions", startDate: daysAgo(80), status: "active", progress: [] }],
    ["therapySessions", ids.session, { providerId: ids.provider, date: daysAgo(3), durationMinutes: 45, goalIds: [ids.goal], summary: "Good session" }],
    ["iepPlans", ids.plan, { childId: childA, type: "iep", school: "Example Elementary", startDate: daysAgo(100), annualReviewDate: daysAgo(-200), reevaluationDate: daysAgo(-900), team: [] }],
    ["iepGoals", ids.iepGoal, { planId: ids.plan, area: "Reading", description: "Reads short passages", targetValue: 80, progress: [] }],
    ["accommodations", ids.support, { planId: ids.plan, kind: "accommodation", title: "Movement breaks", deliveryLog: [] }],
    ["schoolMessages", ids.message, { childId: childA, date: daysAgo(5), type: "email", direction: "from-school", subject: "Field trip", attachments: [] }],
  ];
  for (const [collection, id, body] of records) {
    r = await api("PUT", `/api/v1/records/${collection}/${id}`, { token: A.token, body });
    check(`A saves ${collection}`, r.status === 200, `${r.status} ${r.json?.error ?? ""}`);
  }
  r = await api("PUT", `/api/v1/records/logs/${ids.log}`, { token: A.token, body: records[0][2] });
  check("saving the same record again is safe (upsert) → 200", r.status === 200, r.status);
  r = await api("PUT", `/api/v1/records/logs/${randomUUID()}`, { token: A.token, body: { childId: childA, date: today, kind: "mood", rating: 9 } });
  check("an invalid record → 400 with a message", r.status === 400 && !!r.json?.error, r.json?.error);
  r = await api("PUT", `/api/v1/records/nonsense/${randomUUID()}`, { token: A.token, body: { childId: childA } });
  check("an unknown collection → 404", r.status === 404, r.status);

  // ---------------------------------------------------------------- reads (A)
  const q = `?tz=${encodeURIComponent(tz)}`;
  const reads = {
    child: [`/api/v1/children/${childA}`, (j) => j.child?.firstName === "Wren" && j.access?.role === "admin"],
    home: [`/api/v1/children/${childA}/home${q}`, (j) => j.today === today && j.weekLogs?.some((l) => l.id === ids.log) && j.iepPlan?.id === ids.plan && j.medications?.length === 1],
    logs: [`/api/v1/children/${childA}/logs?from=${daysAgo(30)}&to=${today}`, (j) => j.logs?.length === 1 && j.logs[0].loggedBy === "QA" && j.milestones?.length === 1],
    timeline: [`/api/v1/children/${childA}/timeline${q}`, (j) => j.milestones?.length === 1 && j.medicationChanges?.length === 1 && j.sessions?.length === 1 && j.schoolMessages?.length === 1],
    medications: [`/api/v1/children/${childA}/medications${q}`, (j) => j.medications?.[0]?.id === ids.med && j.reminders?.length === 1 && j.medicationChanges?.length === 1],
    therapy: [`/api/v1/children/${childA}/therapy${q}`, (j) => j.providers?.length === 1 && j.goals?.length === 1 && j.sessions?.length === 1],
    school: [`/api/v1/children/${childA}/school`, (j) => j.iepPlan?.id === ids.plan && j.goals?.length === 1 && j.accommodations?.length === 1 && j.messages?.length === 1],
    "check-ins": [`/api/v1/children/${childA}/check-ins`, (j) => Array.isArray(j.respondents) && Array.isArray(j.links)],
    families: ["/api/v1/families", (j) => j.families?.length === 1],
    search: ["/api/v1/medications/search?q=guanf", (j) => j.results?.[0]?.generic === "Guanfacine"],
  };
  for (const [name, [path, ok]] of Object.entries(reads)) {
    r = await api("GET", path, { token: A.token });
    check(`A reads ${name}`, r.status === 200 && ok(r.json ?? {}), r.status);
  }
  for (const p of [L, V]) {
    for (const name of ["child", "home", "logs", "timeline", "medications", "therapy", "school", "check-ins"]) {
      r = await api("GET", reads[name][0], { token: p.token });
      check(`${p.key} (${p === L ? "log" : "view"}) reads ${name}`, r.status === 200, r.status);
    }
  }
  r = await api("GET", "/api/v1/account/export", { token: A.token });
  check("A exports their data (includes the child)", r.status === 200 && r.text.includes(childA), r.status);

  // ---------------------------------------------------------------- check-in links
  r = await api("POST", `/api/v1/children/${childA}/check-in-links`, { token: A.token, body: { respondent: { name: "Ms. Example", role: "classroom-teacher" }, days: 30 } });
  check("check-in link without consent → 400", r.status === 400, r.json?.error);
  r = await api("POST", `/api/v1/children/${childA}/check-in-links`, { token: A.token, body: { respondent: { name: "Ms. Example", role: "classroom-teacher" }, days: 30, consent: true } });
  const linkToken = r.json?.token;
  check("A creates a check-in link → token", r.status === 200 && /^[A-Za-z0-9_-]{43}$/.test(linkToken ?? ""), r.status);
  r = await api("GET", `/api/v1/children/${childA}/check-ins`, { token: A.token });
  const linkId = r.json?.links?.[0]?.id;
  check("check-in link tokens are shown once: never in GET check-ins", r.json?.links?.length === 1 && !r.text.includes(linkToken) && !("token" in (r.json.links[0] ?? {})));
  const page = await fetch(`${base}/c/${linkToken}`);
  check("the teacher's check-in page works with the link", page.status === 200, page.status);

  // ---------------------------------------------------------------- signed out: every route → 401
  const fakeId = randomUUID();
  const authed = [
    ["GET", "/api/v1/me"],
    ["GET", "/api/v1/families"],
    ["GET", "/api/v1/medications/search?q=guanf"],
    ["GET", "/api/v1/account/export"],
    ["POST", "/api/v1/account/password"],
    ["POST", "/api/v1/account/sign-out-everywhere"],
    ["POST", "/api/v1/account/delete"],
    ["POST", "/api/v1/auth/sign-out"],
    ["POST", "/api/v1/children"],
    ...["", "/home", "/logs", "/timeline", "/medications", "/therapy", "/school", "/check-ins"].map((s) => ["GET", `/api/v1/children/${childA}${s}`]),
    ["PATCH", `/api/v1/children/${childA}`],
    ["DELETE", `/api/v1/children/${childA}`],
    ["POST", `/api/v1/children/${childA}/share-consent`],
    ["POST", `/api/v1/children/${childA}/check-in-links`],
    ["POST", `/api/v1/check-in-links/${linkId}/revoke`],
    ["PUT", `/api/v1/records/logs/${fakeId}`],
    ["DELETE", `/api/v1/records/logs/${ids.log}`],
    ["POST", `/api/v1/families/${familyA}/invites`],
    ["POST", `/api/v1/families/${familyA}/invites/${spareId}/cancel`],
    ["PATCH", `/api/v1/families/${familyA}/members/${V.id}`],
    ["DELETE", `/api/v1/families/${familyA}/members/${V.id}`],
    ["POST", `/api/v1/join/${inviteL}`],
  ];
  let all401 = true;
  for (const [method, path] of authed) {
    for (const token of [undefined, "made-up-token"]) {
      r = await api(method, path, { token, body: method === "GET" || method === "DELETE" ? undefined : {} });
      if (r.status !== 401) {
        all401 = false;
        check(`${method} ${path} ${token ? "with a made-up token" : "signed out"} → 401`, false, r.status);
      }
    }
  }
  check(`all ${authed.length} signed-in routes → 401 signed out and with a made-up token`, all401);

  // ---------------------------------------------------------------- roles: view and log
  const newLog = (who) => ({ childId: childA, date: today, kind: "win", text: `Win logged by ${who}` });
  const adminOnly = [
    ["PATCH", `/api/v1/children/${childA}`, { firstName: "Changed", birthDate: "2017-03-09" }],
    ["DELETE", `/api/v1/children/${childA}`],
    ["POST", `/api/v1/children/${childA}/share-consent`, { sections: ["basics"], audience: "teacher" }],
    ["POST", `/api/v1/children/${childA}/check-in-links`, { respondent: { name: "Mr. Example", role: "aide" }, days: 30, consent: true }],
    ["POST", `/api/v1/check-in-links/${linkId}/revoke`],
    ["PUT", `/api/v1/records/medications/${randomUUID()}`, { childId: childA, name: "Other", startDate: today }],
    ["PUT", `/api/v1/records/medicationChanges/${randomUUID()}`, { medicationId: ids.med, date: today, type: "dose-change", doseMg: 2, schedule: "Twice daily" }],
    ["PUT", `/api/v1/records/iepGoals/${ids.iepGoal}`, { planId: ids.plan, area: "Reading", description: "Changed", targetValue: 90, progress: [] }],
    ["DELETE", `/api/v1/records/medications/${ids.med}`],
    ["POST", `/api/v1/families/${familyA}/invites`, { label: "Someone", role: "view", days: 7, consent: true }],
    ["POST", `/api/v1/families/${familyA}/invites/${spareId}/cancel`],
    ["PATCH", `/api/v1/families/${familyA}/members/${A.id}`, { role: "view" }],
    ["DELETE", `/api/v1/families/${familyA}/members/${A.id}`],
  ];
  for (const p of [V, L]) {
    let all403 = true;
    for (const [method, path, body] of adminOnly) {
      r = await api(method, path, { token: p.token, body });
      if (r.status !== 403) {
        all403 = false;
        check(`${p.key}: ${method} ${path} → 403`, false, r.status);
      }
    }
    check(`${p.key} (${p === L ? "log" : "view"}) gets 403 on all ${adminOnly.length} admin-only actions`, all403);
  }
  r = await api("PUT", `/api/v1/records/logs/${ids.log2}`, { token: V.token, body: newLog("V") });
  check("V (view) can't add a log → 403", r.status === 403, r.status);
  r = await api("PUT", `/api/v1/records/milestones/${randomUUID()}`, { token: V.token, body: { childId: childA, date: today, category: "life", title: "x" } });
  check("V (view) can't add a milestone → 403", r.status === 403, r.status);
  r = await api("DELETE", `/api/v1/records/logs/${ids.log}`, { token: V.token });
  check("V (view) can't delete a log → 403", r.status === 403, r.status);
  r = await api("PUT", `/api/v1/records/logs/${ids.log2}`, { token: L.token, body: newLog("L") });
  check("L (log) adds a log → 200", r.status === 200, `${r.status} ${r.json?.error ?? ""}`);
  r = await api("PUT", `/api/v1/records/milestones/${randomUUID()}`, { token: L.token, body: { childId: childA, date: today, category: "life", title: "Tied shoes" } });
  check("L (log) adds a milestone → 200", r.status === 200, r.status);
  r = await api("DELETE", `/api/v1/records/logs/${ids.log2}`, { token: L.token });
  check("L (log) deletes a log → 200", r.status === 200, r.status);
  r = await api("GET", `/api/v1/children/${childA}/school`, { token: A.token });
  check("role checks changed nothing (IEP goal and meds unchanged)", r.json?.goals?.[0]?.targetValue === 80);

  // ---------------------------------------------------------------- family B can't see family A
  const childScoped = ["", "/home", "/logs", "/timeline", "/medications", "/therapy", "/school", "/check-ins"];
  let hidden = true;
  for (const s of childScoped) {
    r = await api("GET", `/api/v1/children/${childA}${s}${q}`, { token: B.token });
    if (r.status !== 404 || r.text.includes("Wren")) {
      hidden = false;
      check(`B GET child A${s} → 404`, false, r.status);
    }
  }
  check("B gets 404 for every read of A's child", hidden);
  const crossWrites = [
    ["PUT", `/api/v1/records/logs/${randomUUID()}`, { childId: childA, date: today, kind: "mood", rating: 3 }],
    ["PUT", `/api/v1/records/logs/${ids.log}`, { childId: childB, date: today, kind: "mood", rating: 1 }],
    ["PUT", `/api/v1/records/medicationChanges/${randomUUID()}`, { medicationId: ids.med, date: today, type: "stop", doseMg: 0, schedule: "Stopped" }],
    ["DELETE", `/api/v1/records/logs/${ids.log}`],
    ["PATCH", `/api/v1/children/${childA}`, { firstName: "Taken", birthDate: "2017-03-09" }],
    ["DELETE", `/api/v1/children/${childA}`],
    ["POST", `/api/v1/children/${childA}/check-in-links`, { respondent: { name: "X", role: "aide" }, days: 30, consent: true }],
    ["POST", `/api/v1/check-in-links/${linkId}/revoke`],
    ["POST", `/api/v1/families/${familyA}/invites`, { label: "X", role: "admin", days: 7, consent: true }],
    ["POST", `/api/v1/families/${familyA}/invites/${spareId}/cancel`],
    ["PATCH", `/api/v1/families/${familyA}/members/${A.id}`, { role: "view" }],
    ["DELETE", `/api/v1/families/${familyA}/members/${V.id}`],
  ];
  let blocked = true;
  for (const [method, path, body] of crossWrites) {
    r = await api(method, path, { token: B.token, body });
    if (r.status !== 404) {
      blocked = false;
      check(`B: ${method} ${path} → 404`, false, `${r.status} ${r.json?.error ?? ""}`);
    }
  }
  check(`B gets 404 for all ${crossWrites.length} writes into family A`, blocked);
  r = await api("GET", `/api/v1/children/${childA}/logs`, { token: A.token });
  check("A's records are untouched by B", r.json?.logs?.length === 1 && r.json.logs[0].rating === 4);
  r = await api("GET", "/api/v1/account/export", { token: B.token });
  check("B's export doesn't include A's child", r.status === 200 && !r.text.includes(childA) && !r.text.includes("Wren"));

  // ---------------------------------------------------------------- admin actions that work
  r = await api("PATCH", `/api/v1/children/${childA}?tz=${tz}`, { token: A.token, body: { firstName: "Wren", birthDate: "2017-03-09", likes: ["Trains"] } });
  check("A edits About Me", r.status === 200, `${r.status} ${r.json?.error ?? ""}`);
  r = await api("POST", `/api/v1/children/${childA}/share-consent`, { token: A.token, body: { sections: ["basics", "likes"], audience: "teacher" } });
  check("A records share consent", r.status === 200, r.status);
  r = await api("POST", `/api/v1/check-in-links/${linkId}/revoke`, { token: A.token });
  check("A revokes the check-in link", r.status === 200, r.status);
  const revokedPage = await fetch(`${base}/c/${linkToken}`).then((res) => res.text());
  check("the revoked link no longer shows the form", !revokedPage.includes("Ms. Example"));
  r = await api("POST", `/api/v1/families/${familyA}/invites/${spareId}/cancel`, { token: A.token });
  check("A cancels an unused invite", r.status === 200, r.status);
  r = await api("POST", `/api/v1/join/${spare.json?.token}`, { token: B.token });
  check("the cancelled invite can't be used → 404", r.status === 404, r.status);
  r = await api("PATCH", `/api/v1/families/${familyA}/members/${L.id}`, { token: A.token, body: { role: "view" } });
  check("A changes L to view", r.status === 200, r.status);
  r = await api("PUT", `/api/v1/records/logs/${randomUUID()}`, { token: L.token, body: newLog("L") });
  check("L can't log after becoming view → 403", r.status === 403, r.status);
  r = await api("PATCH", `/api/v1/families/${familyA}/members/${A.id}`, { token: A.token, body: { role: "view" } });
  check("the only admin can't step down → 409", r.status === 409, r.json?.error);
  r = await api("DELETE", `/api/v1/records/medicationChanges/${ids.change}`, { token: A.token });
  check("A deletes a record", r.status === 200, r.status);

  // ---------------------------------------------------------------- leaving, deleting, sessions
  r = await api("DELETE", `/api/v1/families/${familyA}/members/${L.id}`, { token: L.token });
  check("L leaves family A", r.status === 200, r.status);
  r = await api("GET", `/api/v1/children/${childA}`, { token: L.token });
  check("after leaving, L can't see A's child → 404", r.status === 404, r.status);

  r = await api("POST", "/api/v1/account/delete", { token: A.token, body: { password: A.password, confirm: "DELETE" } });
  check("the only admin of a shared family can't delete their account → 409", r.status === 409, r.status);
  r = await api("POST", "/api/v1/account/delete", { token: V.token, body: { password: "wrong-password-1", confirm: "DELETE" } });
  check("account delete with the wrong password → 400", r.status === 400, r.status);
  r = await api("POST", "/api/v1/account/delete", { token: V.token, body: { password: V.password, confirm: "DELETE" } });
  check("V deletes their account", r.status === 200, r.status);
  r = await api("GET", "/api/v1/me", { token: V.token });
  check("V's token stops working after deletion → 401", r.status === 401, r.status);

  const second = (await api("POST", "/api/v1/auth/sign-in", { body: { email: B.email, password: B.password } })).json?.token;
  const newPassword = `Qa-${randomBytes(9).toString("base64url")}`;
  r = await api("POST", "/api/v1/account/password", { token: B.token, body: { currentPassword: "wrong-password-1", newPassword } });
  check("password change with the wrong current password → 400", r.status === 400, r.json?.error);
  r = await api("POST", "/api/v1/account/password", { token: B.token, body: { currentPassword: B.password, newPassword } });
  const rotated = r.json?.token;
  check("password change → 200", r.status === 200, r.status);
  r = await api("GET", "/api/v1/me", { token: second });
  check("password change signs out B's other device → 401", r.status === 401, r.status);
  const current = rotated ?? B.token;
  r = await api("GET", "/api/v1/me", { token: current });
  check(`this device stays signed in (${rotated ? "with the new token it was given" : "same token"})`, r.status === 200, r.status);
  r = await api("POST", "/api/v1/auth/sign-out", { token: current });
  check("sign-out → 200", r.status === 200, r.status);
  r = await api("GET", "/api/v1/me", { token: current });
  check("after sign-out → 401", r.status === 401, r.status);

  const other = (await api("POST", "/api/v1/auth/sign-in", { body: { email: A.email, password: A.password } })).json?.token;
  r = await api("POST", "/api/v1/account/sign-out-everywhere", { token: A.token });
  check("sign-out-everywhere → 200", r.status === 200, r.status);
  const [mine, theirs] = await Promise.all([api("GET", "/api/v1/me", { token: A.token }), api("GET", "/api/v1/me", { token: other })]);
  check("sign-out-everywhere ends both of A's devices → 401", mine.status === 401 && theirs.status === 401, `${mine.status}/${theirs.status}`);
} catch (err) {
  failed++;
  console.error("Test stopped:", err.message);
} finally {
  await cleanUp();
  await admin.end();
}

if (retries) console.log(`Waited out Neon Auth's rate limit ${retries} time(s) (503 + Retry-After).`);
console.log(failed ? `${passed} passed, ${failed} failed.` : `All ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
