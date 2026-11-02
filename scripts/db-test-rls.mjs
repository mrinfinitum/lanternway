// Proves row-level security keeps families apart, using the website's own role.
//   pnpm db:test-rls
// Creates two throwaway families, checks every cross-family access is refused, then cleans up.
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const A = "rls-test-user-a";
const B = "rls-test-user-b";
let failures = 0;
const check = (label, ok) => {
  console.log(`${ok ? "pass" : "FAIL"}  ${label}`);
  if (!ok) failures++;
};

/** Run queries as `user` (or as nobody) inside one transaction, the way the website does. */
async function as(user, fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (user) await c.query("select set_config('app.user_id', $1, true)", [user]);
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    return { error: e.message };
  } finally {
    c.release();
  }
}

const familyFor = (user) =>
  as(user, async (c) => {
    const f = (await c.query("insert into families (created_by) values ($1) returning id", [user])).rows[0].id;
    await c.query("insert into family_members (family_id, user_id, role) values ($1, $2, 'admin')", [f, user]);
    const ch = (await c.query("insert into children (family_id, profile) values ($1, $2) returning id", [f, { firstName: `Kid of ${user}` }])).rows[0].id;
    return { f, ch };
  });

try {
  const a = await familyFor(A);
  const b = await familyFor(B);
  check("each user can create their own family and child", Boolean(a.f && b.f && a.ch && b.ch));

  const aSees = await as(A, async (c) => (await c.query("select id from children")).rows.map((r) => r.id));
  check("A sees only A's child", aSees.length === 1 && aSees[0] === a.ch);

  const nobody = await as(null, async (c) => (await c.query("select count(*)::int n from children")).rows[0].n);
  check("no user set: sees no children", nobody === 0);

  const readB = await as(A, async (c) => (await c.query("select * from children where id = $1", [b.ch])).rows.length);
  check("A cannot read B's child by id", readB === 0);

  const upd = await as(A, async (c) => (await c.query("update children set profile = '{}' where id = $1", [b.ch])).rowCount);
  check("A cannot update B's child", upd === 0);

  const del = await as(A, async (c) => (await c.query("delete from children where id = $1", [b.ch])).rowCount);
  check("A cannot delete B's child", del === 0);

  const ins = await as(A, async (c) => c.query("insert into children (family_id, profile) values ($1, '{}')", [b.f]));
  check("A cannot add a child to B's family", Boolean(ins?.error));

  const join = await as(A, async (c) => c.query("insert into family_members (family_id, user_id, role) values ($1, $2, 'admin')", [b.f, A]));
  check("A cannot join B's family", Boolean(join?.error));

  const fam = await as(A, async (c) => (await c.query("select id from families")).rows.map((r) => r.id));
  check("A sees only A's family", fam.length === 1 && fam[0] === a.f);

  // Consents: each person only ever sees or records their own.
  await as(A, async (c) => c.query("insert into consents (user_id, kind, policy_version) values ($1, 'terms', 'test')", [A]));
  await as(B, async (c) => c.query("insert into consents (user_id, kind, policy_version) values ($1, 'terms', 'test')", [B]));
  const aConsents = await as(A, async (c) => (await c.query("select user_id from consents")).rows.map((r) => r.user_id));
  check("A sees only A's consents", aConsents.length === 1 && aConsents[0] === A);
  const forge = await as(A, async (c) => c.query("insert into consents (user_id, kind, policy_version) values ($1, 'terms', 'test')", [B]));
  check("A cannot record a consent for B", Boolean(forge?.error));
  const wipe = await as(A, async (c) => (await c.query("delete from consents where user_id = $1", [B])).rowCount);
  check("A cannot delete B's consents", wipe === 0);

  // Account deletion: A can delete A's own family, never B's.
  const delB = await as(A, async (c) => (await c.query("delete from families where id = $1", [b.f])).rowCount);
  check("A cannot delete B's family", delB === 0);

  // Records (logs, medications, school…): same family isolation.
  const recA = "11111111-1111-4111-8111-111111111111";
  const recB = "22222222-2222-4222-8222-222222222222";
  const insA = await as(A, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values ($1, $2, $3, 'log', '{}')", [recA, a.f, a.ch]));
  check("A can save a record for A's child", !insA?.error);
  await as(B, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values ($1, $2, $3, 'log', '{}')", [recB, b.f, b.ch]));
  const aRecs = await as(A, async (c) => (await c.query("select id from records")).rows.map((r) => r.id));
  check("A sees only A's records", aRecs.length === 1 && aRecs[0] === recA);
  const intoB = await as(A, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values (gen_random_uuid(), $1, $2, 'log', '{}')", [b.f, b.ch]));
  check("A cannot save a record into B's family", Boolean(intoB?.error));
  const mismatch = await as(A, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values (gen_random_uuid(), $1, $2, 'log', '{}')", [a.f, b.ch]));
  check("a record can't pair A's family with B's child", Boolean(mismatch?.error));
  const updB = await as(A, async (c) => (await c.query("update records set data = '{\"x\":1}' where id = $1", [recB])).rowCount);
  check("A cannot change B's record", updB === 0);
  const delB2 = await as(A, async (c) => (await c.query("delete from records where id = $1", [recB])).rowCount);
  check("A cannot delete B's record", delB2 === 0);

  // Medication reminders (records kind 'medication_reminder', attached to a medication).
  const medA = "33333333-3333-4333-8333-333333333333";
  const remA = "44444444-4444-4444-8444-444444444444";
  const remSaved = await as(A, async (c) => {
    await c.query("insert into records (id, family_id, child_id, kind, data) values ($1, $2, $3, 'medication', '{}')", [medA, a.f, a.ch]);
    return c.query("insert into records (id, family_id, child_id, kind, parent_id, data) values ($1, $2, $3, 'medication_reminder', $4, '{}')", [remA, a.f, a.ch, medA]);
  });
  check("A can save a medication reminder for A's child", !remSaved?.error);
  const bRem = await as(B, async (c) => (await c.query("select count(*)::int n from records where kind = 'medication_reminder'")).rows[0].n);
  check("B cannot see A's medication reminders", bRem === 0);
  const remIntoB = await as(A, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values (gen_random_uuid(), $1, $2, 'medication_reminder', '{}')", [b.f, b.ch]));
  check("A cannot save a reminder into B's family", Boolean(remIntoB?.error));
  await as(A, async (c) => c.query("delete from records where id = $1", [medA]));
  const remGone = await as(A, async (c) => (await c.query("select count(*)::int n from records where id = $1", [remA])).rows[0].n);
  check("deleting a medication deletes its reminder", remGone === 0);

  // Self-deletion of the sign-in account: only ever the caller's own, never with no user.
  const selfDel = await as("00000000-0000-0000-0000-000000000000", async (c) => (await c.query("select delete_my_auth_account() as n")).rows[0].n);
  check("delete_my_auth_account removes nothing for an unknown caller", selfDel === 0);
  const anonDel = await as(null, async (c) => c.query("select delete_my_auth_account()"));
  check("delete_my_auth_account refuses with no signed-in user", Boolean(anonDel?.error));
  const peek = await as(A, async (c) => c.query('select count(*) from neon_auth."user"'));
  check("website role cannot read the auth tables directly", Boolean(peek?.error));

  // Check-in links (rule 4): family-only management; the public side only through the two functions.
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const link = await as(A, async (c) => {
    const r = (await c.query("insert into checkin_respondents (family_id, child_id, name, role) values ($1, $2, 'Ms. Test', 'aide') returning id", [a.f, a.ch])).rows[0].id;
    const l = (await c.query("insert into checkin_links (family_id, child_id, respondent_id, token_hash, expires_at) values ($1, $2, $3, $4, now() + interval '30 days') returning id", [a.f, a.ch, r, hash])).rows[0].id;
    return { r, l };
  });
  check("A can create a check-in link for A's child", Boolean(link?.l));
  const bResp = await as(B, async (c) => (await c.query("select count(*)::int n from checkin_respondents")).rows[0].n);
  check("B cannot see A's check-in respondents", bResp === 0);
  const bLinks = await as(B, async (c) => (await c.query("select count(*)::int n from checkin_links")).rows[0].n);
  check("B cannot see A's check-in links", bLinks === 0);
  const respIntoB = await as(A, async (c) => c.query("insert into checkin_respondents (family_id, child_id, name, role) values ($1, $2, 'X', 'aide')", [b.f, b.ch]));
  check("A cannot add a respondent to B's family", Boolean(respIntoB?.error));
  const respMismatch = await as(A, async (c) => c.query("insert into checkin_respondents (family_id, child_id, name, role) values ($1, $2, 'X', 'aide')", [a.f, b.ch]));
  check("a respondent can't pair A's family with B's child", Boolean(respMismatch?.error));
  const bRevoke = await as(B, async (c) => (await c.query("update checkin_links set revoked_at = now() where id = $1", [link.l])).rowCount);
  check("B cannot revoke A's link", bRevoke === 0);
  const anonLinks = await as(null, async (c) => (await c.query("select count(*)::int n from checkin_links")).rows[0].n);
  check("no user set: cannot read check-in links", anonLinks === 0);

  const ctx = await as(null, async (c) => (await c.query("select * from checkin_form_context($1)", [token])).rows);
  check("public form context: first name and respondent only", ctx.length === 1 && ctx[0].child_first_name === `Kid of ${A}` && Object.keys(ctx[0]).sort().join() === "child_first_name,expires_at,respondent_name");
  const ctxBad = await as(null, async (c) => (await c.query("select * from checkin_form_context($1)", ["x".repeat(43)])).rows.length);
  check("public form context: unknown token gives nothing", ctxBad === 0);
  const ctxHash = await as(null, async (c) => (await c.query("select * from checkin_form_context($1)", [hash])).rows.length);
  check("public form context: the stored hash doesn't work as a link", ctxHash === 0);

  const submit = (t, focus = 4) => as(null, async (c) => (await c.query("select submit_checkin($1, current_date, $2, 3, 4, 5, 'Good day') as ok", [t, focus])).rows[0].ok);
  check("public submit with a valid link saves", (await submit(token)) === true);
  check("public submit again the same day updates (no duplicate)", (await submit(token, 2)) === true);
  const aCheckIns = await as(A, async (c) => (await c.query("select ratings from checkins")).rows);
  check("A sees the one check-in, with the updated rating", aCheckIns.length === 1 && aCheckIns[0].ratings.focus === 2);
  const bCheckIns = await as(B, async (c) => (await c.query("select count(*)::int n from checkins")).rows[0].n);
  check("B cannot see A's check-ins", bCheckIns === 0);
  check("public submit rejects an out-of-range rating", (await submit(token, 9)) === false);
  const forgeCheckIn = await as(A, async (c) => c.query("insert into checkins (family_id, child_id, respondent_id, link_id, date, ratings) values ($1, $2, $3, $4, current_date, '{}')", [a.f, a.ch, link.r, link.l]));
  check("check-ins can't be written directly, only through a link", Boolean(forgeCheckIn?.error));

  await as(A, async (c) => c.query("update checkin_links set revoked_at = now() where id = $1", [link.l]));
  const ctxRevoked = await as(null, async (c) => (await c.query("select * from checkin_form_context($1)", [token])).rows.length);
  check("revoked link: form context gives nothing", ctxRevoked === 0);
  check("revoked link: submit is refused", (await submit(token)) === false);

  const oldToken = randomBytes(32).toString("base64url");
  await as(A, async (c) => c.query("insert into checkin_links (family_id, child_id, respondent_id, token_hash, expires_at) values ($1, $2, $3, $4, now() - interval '1 minute')", [a.f, a.ch, link.r, createHash("sha256").update(oldToken).digest("hex")]));
  const ctxExpired = await as(null, async (c) => (await c.query("select * from checkin_form_context($1)", [oldToken])).rows.length);
  check("expired link: form context gives nothing", ctxExpired === 0);
  check("expired link: submit is refused", (await submit(oldToken)) === false);

  // Family sharing (migration 008): invite links, roles, and keeping an admin.
  const V = "rls-test-user-viewer";
  const L = "rls-test-user-logger";
  const X = "rls-test-user-latecomer";
  const invite = async (role, expires = "now() + interval '7 days'") => {
    const t = randomBytes(32).toString("base64url");
    const r = await as(A, async (c) => c.query(`insert into family_invites (family_id, token_hash, role, label, expires_at) values ($1, $2, $3, 'Test', ${expires})`, [a.f, createHash("sha256").update(t).digest("hex"), role]));
    return r?.error ? null : t;
  };
  const accept = (user, t) => as(user, async (c) => (await c.query("select accept_family_invite($1) as s", [t])).rows[0].s);
  const viewToken = await invite("view");
  const logToken = await invite("log");
  check("an admin can create invite links", Boolean(viewToken && logToken));
  const bInvites = await as(B, async (c) => (await c.query("select count(*)::int n from family_invites")).rows[0].n);
  check("B cannot see A's invites", bInvites === 0);
  const bInviteIntoA = await as(B, async (c) => c.query("insert into family_invites (family_id, token_hash, role, label, expires_at) values ($1, 'x', 'admin', 'Me', now() + interval '1 day')", [a.f]));
  check("B cannot create an invite into A's family", Boolean(bInviteIntoA?.error));
  const preview = await as(null, async (c) => (await c.query("select * from family_invite_preview($1)", [viewToken])).rows);
  check("public invite preview: role and status only", preview.length === 1 && preview[0].role === "view" && preview[0].status === "open" && Object.keys(preview[0]).length === 3);
  const previewUnknown = await as(null, async (c) => (await c.query("select * from family_invite_preview($1)", ["nope"])).rows.length);
  check("public invite preview: unknown link gives nothing", previewUnknown === 0);
  const anonAccept = await as(null, async (c) => c.query("select accept_family_invite($1)", [viewToken]));
  check("accepting needs a signed-in person", Boolean(anonAccept?.error));
  check("a signed-in person can accept an invite", (await accept(V, viewToken)) === "joined");
  check("an accepted invite can't be used by someone else", (await accept(X, viewToken)) === "used");
  check("accepting your own invite again is harmless", (await accept(V, viewToken)) === "already");
  check("log invite accepted", (await accept(L, logToken)) === "joined");
  const xSees = await as(X, async (c) => (await c.query("select count(*)::int n from children")).rows[0].n);
  check("someone with a used link sees nothing", xSees === 0);

  const vSees = await as(V, async (c) => (await c.query("select id from children")).rows.map((r) => r.id));
  check("view member sees the family's child", vSees.length === 1 && vSees[0] === a.ch);
  const vLog = await as(V, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values (gen_random_uuid(), $1, $2, 'log', '{}')", [a.f, a.ch]));
  check("view member cannot add a log", Boolean(vLog?.error));
  const vChild = await as(V, async (c) => (await c.query("update children set profile = profile where id = $1", [a.ch])).rowCount);
  check("view member cannot edit About Me", vChild === 0);
  const vRecDel = await as(V, async (c) => (await c.query("delete from records where family_id = $1", [a.f])).rowCount);
  check("view member cannot delete records", vRecDel === 0);

  const logId = "55555555-5555-4555-8555-555555555555";
  const lLog = await as(L, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values ($1, $2, $3, 'log', '{}')", [logId, a.f, a.ch]));
  check("log member can add a daily log", !lLog?.error);
  const lLogEdit = await as(L, async (c) => (await c.query("update records set data = '{\"x\":1}' where id = $1", [logId])).rowCount);
  check("log member can edit a daily log", lLogEdit === 1);
  const lMed = await as(L, async (c) => c.query("insert into records (id, family_id, child_id, kind, data) values (gen_random_uuid(), $1, $2, 'medication', '{}')", [a.f, a.ch]));
  check("log member cannot add a medication", Boolean(lMed?.error));
  const lRelabel = await as(L, async (c) => (await c.query("update records set kind = 'medication' where id = $1", [logId])).rowCount);
  check("log member cannot turn a log into another kind", lRelabel === 0 || lRelabel?.error);
  const lChild = await as(L, async (c) => (await c.query("update children set profile = profile where id = $1", [a.ch])).rowCount);
  check("log member cannot edit About Me", lChild === 0);
  const lNewChild = await as(L, async (c) => c.query("insert into children (family_id, profile) values ($1, '{}')", [a.f]));
  check("log member cannot add a child", Boolean(lNewChild?.error));
  const lLink = await as(L, async (c) => c.query("insert into checkin_respondents (family_id, child_id, name, role) values ($1, $2, 'T', 'teacher')", [a.f, a.ch]));
  check("log member cannot set up teacher check-ins", Boolean(lLink?.error));
  const lInvites = await as(L, async (c) => (await c.query("select count(*)::int n from family_invites")).rows[0].n);
  check("log member cannot see invites", lInvites === 0);
  const lInvite = await as(L, async (c) => c.query("insert into family_invites (family_id, token_hash, role, label, expires_at) values ($1, 'y', 'admin', 'Me', now() + interval '1 day')", [a.f]));
  check("log member cannot create invites", Boolean(lInvite?.error));
  const lPromote = await as(L, async (c) => (await c.query("update family_members set role = 'admin' where user_id = $1", [L])).rowCount);
  check("log member cannot make themselves admin", lPromote === 0);

  const members = await as(V, async (c) => (await c.query("select * from my_family_members()")).rows);
  check("members list shows this family's members only", members.length === 3 && members.every((m) => m.family_id === a.f));
  const bMembers = await as(B, async (c) => (await c.query("select * from my_family_members()")).rows);
  check("B's members list doesn't include A's family", bMembers.length === 1 && bMembers[0].user_id === B);

  const demoteSelf = await as(A, async (c) => c.query("update family_members set role = 'view' where user_id = $1", [A]));
  check("the only admin can't demote themselves", Boolean(demoteSelf?.error));
  const leaveSelf = await as(A, async (c) => c.query("delete from family_members where user_id = $1", [A]));
  check("the only admin can't leave the family", Boolean(leaveSelf?.error));
  const promote = await as(A, async (c) => (await c.query("update family_members set role = 'admin' where user_id = $1", [L])).rowCount);
  check("an admin can change a member's role", promote === 1);
  const remove = await as(A, async (c) => (await c.query("delete from family_members where user_id = $1", [L])).rowCount);
  check("an admin can remove a member", remove === 1);
  const vLeave = await as(V, async (c) => (await c.query("delete from family_members where user_id = $1", [V])).rowCount);
  check("a member can leave", vLeave === 1);
  const vAfter = await as(V, async (c) => (await c.query("select count(*)::int n from children")).rows[0].n);
  check("after leaving, they see nothing", vAfter === 0);

  const revoked = await invite("view");
  await as(A, async (c) => c.query("update family_invites set revoked_at = now() where token_hash = $1", [createHash("sha256").update(revoked).digest("hex")]));
  check("revoked invite can't be accepted", (await accept(X, revoked)) === "invalid");
  const expired = await invite("view", "now() - interval '1 minute'");
  check("expired invite can't be accepted", (await accept(X, expired)) === "invalid");

  const bJoinsA = await accept(B, await invite("view"));
  const bGone = await as(B, async (c) => (await c.query("delete from families where id = $1", [b.f])).rowCount);
  check("an admin can still delete their whole family", bJoinsA === "joined" && bGone === 1);

  const ddl = await as(A, async (c) => c.query("create table sneaky (id int)"));
  check("website role still cannot create tables", Boolean(ddl?.error));
} finally {
  // The website role can't delete families (by design), so clean up with the owner role.
  const admin = new Pool({ connectionString: process.env.DATABASE_URL_ADMIN });
  await admin.query("delete from families where created_by = any($1)", [[A, B]]);
  await admin.query("delete from consents where user_id = any($1)", [[A, B]]);
  await admin.end();
  await pool.end();
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll row-level security checks passed.");
