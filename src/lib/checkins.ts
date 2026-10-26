/**
 * Teacher & therapist check-ins for a family's own children (CLAUDE.md rule 4).
 * Stored in Neon (db/migrations/006_checkins.sql). Server-only.
 *
 * Links: 32 random bytes, shown to the parent once. Only a SHA-256 hash is stored.
 * The public page never reads family tables; it calls two narrow database
 * functions that check the link and return or save only what the form needs.
 */

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { getSignedInUser } from "@/lib/auth/server";
import { isSavedChildId } from "@/lib/child-profile";
import { asNobody, asUser } from "@/lib/db";
import { isRecordId } from "@/lib/records";
import type { CheckIn, CheckInFormContext, CheckInLink, CheckInRatings, CheckInRespondent, IsoDate, RespondentRole } from "@/lib/types";

export const RESPONDENT_ROLES: RespondentRole[] = ["classroom-teacher", "special-ed-teacher", "aide", "therapist", "sitter"];
/** How long a new link works, in days. */
export const LINK_LIFETIMES = [30, 90, 180] as const;

/** Saved-link tokens are 32 random bytes in base64url: 43 characters. */
export const isSavedLinkToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
const hashToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

type ChildCheckInData = { respondents: CheckInRespondent[]; links: CheckInLink[]; checkIns: CheckIn[] };

/** Respondents, links (without tokens), and check-ins for one saved child. One trip per request. */
export const loadChildCheckIns = cache(async (childId: string): Promise<ChildCheckInData> => {
  const empty: ChildCheckInData = { respondents: [], links: [], checkIns: [] };
  if (!isSavedChildId(childId)) return empty;
  const user = await getSignedInUser();
  if (!user) return empty;
  return asUser(user.id, async (db) => {
    const respondents = (await db.query<{ id: string; name: string; role: RespondentRole; email: string | null }>(
      "select id, name, role, email from checkin_respondents where child_id = $1 order by created_at", [childId],
    )).rows.map((r) => ({ id: r.id, childId, name: r.name, role: r.role, ...(r.email ? { email: r.email } : {}) }));
    const links = (await db.query<{ id: string; respondent_id: string; created_at: Date; expires_at: Date; revoked_at: Date | null; last_used_at: Date | null }>(
      "select id, respondent_id, created_at, expires_at, revoked_at, last_used_at from checkin_links where child_id = $1 order by created_at", [childId],
    )).rows.map((l) => ({
      id: l.id,
      childId,
      respondentId: l.respondent_id,
      createdAt: l.created_at.toISOString(),
      expiresAt: l.expires_at.toISOString(),
      ...(l.revoked_at ? { revokedAt: l.revoked_at.toISOString() } : {}),
      ...(l.last_used_at ? { lastUsedAt: l.last_used_at.toISOString() } : {}),
    }));
    const checkIns = (await db.query<{ id: string; respondent_id: string; date: string; ratings: CheckInRatings; note: string | null }>(
      "select id, respondent_id, to_char(date, 'YYYY-MM-DD') as date, ratings, note from checkins where child_id = $1 order by date, created_at", [childId],
    )).rows.map((c) => ({ id: c.id, childId, respondentId: c.respondent_id, date: c.date, ratings: c.ratings, ...(c.note ? { note: c.note } : {}) }));
    return { respondents, links, checkIns };
  });
});

export type NewLinkInput = {
  childId: string;
  /** An existing respondent, or a new one. */
  respondentId?: string;
  respondent?: { name: string; role: RespondentRole; email?: string };
  days: number;
};

/**
 * Create a check-in link. Returns the raw token, the only time it exists outside
 * the parent's browser, or a message if something's wrong.
 */
export async function createCheckInLink(userId: string, input: NewLinkInput): Promise<{ token: string } | string> {
  if (!isSavedChildId(input.childId)) return "Check-in links are for your own kids, not the sample family.";
  if (!(LINK_LIFETIMES as readonly number[]).includes(input.days)) return "Pick how long the link should work.";
  const token = randomBytes(32).toString("base64url");

  return asUser(userId, async (db) => {
    const child = (await db.query<{ family_id: string }>("select family_id from children where id = $1", [input.childId])).rows[0];
    if (!child) return "We couldn't find that child.";

    let respondentId = input.respondentId;
    if (respondentId) {
      if (!isRecordId(respondentId)) return "We couldn't find that person.";
      const found = await db.query("select 1 from checkin_respondents where id = $1 and child_id = $2", [respondentId, input.childId]);
      if (!found.rowCount) return "We couldn't find that person.";
    } else {
      const name = input.respondent?.name.trim().slice(0, 80) ?? "";
      const email = input.respondent?.email?.trim().slice(0, 120) || null;
      const role = input.respondent?.role;
      if (!name) return "Add the person's name.";
      if (!role || !RESPONDENT_ROLES.includes(role)) return "Pick the person's role.";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email doesn't look right.";
      respondentId = (await db.query<{ id: string }>(
        "insert into checkin_respondents (family_id, child_id, name, role, email) values ($1, $2, $3, $4, $5) returning id",
        [child.family_id, input.childId, name, role, email],
      )).rows[0].id;
    }

    await db.query(
      "insert into checkin_links (family_id, child_id, respondent_id, token_hash, expires_at) values ($1, $2, $3, $4, now() + make_interval(days => $5))",
      [child.family_id, input.childId, respondentId, hashToken(token), input.days],
    );
    return { token };
  });
}

/** Turn a link off for good. Returns false if it wasn't this family's link. */
export async function revokeCheckInLink(userId: string, linkId: string): Promise<boolean> {
  if (!isRecordId(linkId)) return false;
  return asUser(userId, async (db) =>
    ((await db.query("update checkin_links set revoked_at = now() where id = $1 and revoked_at is null", [linkId])).rowCount ?? 0) > 0,
  );
}

/** Public: what the check-in form may show, or null for unknown, revoked, or expired links. */
export async function savedLinkFormContext(token: string): Promise<CheckInFormContext | null> {
  if (!isSavedLinkToken(token)) return null;
  const row = await asNobody(async (db) =>
    (await db.query<{ child_first_name: string | null; respondent_name: string; expires_at: Date }>(
      "select * from checkin_form_context($1)", [token],
    )).rows[0],
  );
  if (!row) return null;
  return { childFirstName: row.child_first_name || "your student", respondentName: row.respondent_name, expiresAt: row.expires_at.toISOString() };
}

/** Public: save a check-in through a link. One per link per day; sending again updates it. */
export async function submitSavedCheckIn(token: string, date: IsoDate, ratings: CheckInRatings, note: string): Promise<boolean> {
  if (!isSavedLinkToken(token)) return false;
  return asNobody(async (db) =>
    (await db.query<{ ok: boolean }>(
      "select submit_checkin($1, $2, $3, $4, $5, $6, $7) as ok",
      [token, date, ratings.focus, ratings.mood, ratings.behavior, ratings.participation, note.slice(0, 600)],
    )).rows[0]?.ok === true,
  );
}
