/**
 * Data export and account deletion for the signed-in parent. Server-only.
 * Everything runs through asUser(), so row-level security limits it to their own data.
 */

import { asUser } from "@/lib/db";

/** Everything Lanternway stores for this account, as plain JSON. */
export async function exportAccountData(user: { id: string; name: string; email: string }) {
  return asUser(user.id, async (db) => {
    const families = (await db.query("select id, name, created_at from families order by created_at")).rows;
    const members = (await db.query("select family_id, user_id, role, created_at from family_members order by created_at")).rows;
    const children = (await db.query("select id, family_id, profile, created_at, updated_at from children order by created_at")).rows;
    const records = (await db.query("select id, child_id, kind, parent_id, occurred_on, data, created_at, updated_at from records order by child_id, kind, occurred_on nulls last")).rows;
    const consents = (await db.query("select kind, policy_version, details, granted_at, withdrawn_at from consents order by granted_at")).rows;
    const checkInRespondents = (await db.query("select id, child_id, name, role, email, created_at from checkin_respondents order by created_at")).rows;
    // Links are listed without their token hash: it's useless outside Lanternway.
    const checkInLinks = (await db.query("select id, child_id, respondent_id, created_at, expires_at, revoked_at, last_used_at from checkin_links order by created_at")).rows;
    const checkIns = (await db.query("select id, child_id, respondent_id, date, ratings, note, created_at, updated_at from checkins order by child_id, date")).rows;
    return {
      about: "Your Lanternway data export: everything we store for your account (family, kids, their logs, medications, care team, school records, teacher check-ins, and your consents), in JSON format.",
      exportedAt: new Date().toISOString(),
      account: { id: user.id, name: user.name, email: user.email },
      families,
      familyMembers: members,
      children,
      records,
      checkInRespondents,
      checkInLinks,
      checkIns,
      consents,
    };
  });
}

/**
 * Delete the account completely, in one transaction: families where they're the
 * only member (with their children), otherwise just their membership; their consent
 * records; then their sign-in account (via delete_my_auth_account, migration 004).
 * Call only after re-checking the password.
 */
export async function deleteAccountData(userId: string): Promise<{ families: number; memberships: number }> {
  return asUser(userId, async (db) => {
    const mine = (await db.query<{ family_id: string; members: number }>(
      `select m.family_id, (select count(*)::int from family_members x where x.family_id = m.family_id) as members
         from family_members m where m.user_id = $1`,
      [userId],
    )).rows;
    let families = 0;
    let memberships = 0;
    for (const f of mine) {
      if (f.members <= 1) families += (await db.query("delete from families where id = $1", [f.family_id])).rowCount ?? 0;
      else memberships += (await db.query("delete from family_members where family_id = $1 and user_id = $2", [f.family_id, userId])).rowCount ?? 0;
    }
    // Families they created but never joined (shouldn't happen, but leave nothing behind).
    families += (await db.query("delete from families where created_by = $1", [userId])).rowCount ?? 0;
    await db.query("delete from consents where user_id = $1", [userId]);
    // Last: the sign-in account itself (sessions cascade). Same transaction, so it's all or nothing.
    await db.query("select delete_my_auth_account()");
    return { families, memberships };
  });
}
