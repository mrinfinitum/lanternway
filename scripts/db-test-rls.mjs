// Proves row-level security keeps families apart, using the website's own role.
//   pnpm db:test-rls
// Creates two throwaway families, checks every cross-family access is refused, then cleans up.
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

  const ddl = await as(A, async (c) => c.query("create table sneaky (id int)"));
  check("website role still cannot create tables", Boolean(ddl?.error));
} finally {
  // The website role can't delete families (by design), so clean up with the owner role.
  const admin = new Pool({ connectionString: process.env.DATABASE_URL_ADMIN });
  await admin.query("delete from families where created_by = any($1)", [[A, B]]);
  await admin.end();
  await pool.end();
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll row-level security checks passed.");
