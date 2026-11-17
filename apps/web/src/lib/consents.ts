/**
 * Consent records: what a person agreed to, which policy version, and when.
 * Stored in Neon with row-level security (each person sees only their own).
 * Server-only.
 */

import "server-only";
import { asUser } from "@/lib/db";
import { POLICY_VERSIONS } from "@/lib/policies";

export type ConsentKind = "terms" | "privacy" | "health_data_collection" | "adult_guardian" | "test_data" | "share_profile" | "share_checkin" | "share_family";

const versionFor = (kind: ConsentKind): string =>
  kind === "terms" ? POLICY_VERSIONS.terms : kind === "privacy" ? POLICY_VERSIONS.privacy : POLICY_VERSIONS.healthData;

export async function recordConsents(userId: string, kinds: ConsentKind[], details: Record<string, unknown> = {}): Promise<void> {
  await asUser(userId, async (db) => {
    for (const kind of kinds) {
      await db.query("insert into consents (user_id, kind, policy_version, details) values ($1, $2, $3, $4)", [userId, kind, versionFor(kind), details]);
    }
  });
}

export type ConsentRecord = { kind: ConsentKind; policyVersion: string; grantedAt: string; withdrawnAt: string | null; details: Record<string, unknown> };

export async function listConsents(userId: string): Promise<ConsentRecord[]> {
  return asUser(userId, async (db) => {
    const { rows } = await db.query<{ kind: ConsentKind; policy_version: string; granted_at: Date; withdrawn_at: Date | null; details: Record<string, unknown> }>(
      "select kind, policy_version, granted_at, withdrawn_at, details from consents order by granted_at desc",
    );
    return rows.map((r) => ({
      kind: r.kind,
      policyVersion: r.policy_version,
      grantedAt: r.granted_at.toISOString(),
      withdrawnAt: r.withdrawn_at ? r.withdrawn_at.toISOString() : null,
      details: r.details,
    }));
  });
}

/** The agreements every account needs before using Lanternway (the sign-up boxes). */
export const ACCOUNT_CONSENTS: ConsentKind[] = ["adult_guardian", "terms", "privacy", "health_data_collection", "test_data"];

/**
 * True when this person has agreed to everything sign-up asks for (and hasn't withdrawn it).
 * Accounts made around our sign-up form (straight against the sign-in service) have none,
 * so the app and the phone API send them to /agree first.
 */
export async function hasAccountConsents(userId: string): Promise<boolean> {
  return asUser(userId, async (db) => {
    const { rows } = await db.query<{ n: number }>(
      "select count(distinct kind)::int as n from consents where user_id = $1 and kind = any($2::text[]) and withdrawn_at is null",
      [userId, ACCOUNT_CONSENTS],
    );
    return rows[0]?.n === ACCOUNT_CONSENTS.length;
  });
}
