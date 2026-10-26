/**
 * Consent records: what a person agreed to, which policy version, and when.
 * Stored in Neon with row-level security (each person sees only their own).
 * Server-only.
 */

import { asUser } from "@/lib/db";
import { POLICY_VERSIONS } from "@/lib/policies";

export type ConsentKind = "terms" | "privacy" | "health_data_collection" | "adult_guardian" | "test_data" | "share_profile" | "share_checkin";

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
