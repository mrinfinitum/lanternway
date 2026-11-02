/**
 * Current versions of the legal documents. Every consent record stores the
 * version the person agreed to. Bump a version when its document changes in a
 * way people should re-agree to (the lawyer's final text will be "1.0").
 */
export const POLICY_VERSIONS = {
  terms: "draft-2026-10-26",
  privacy: "draft-2026-10-26",
  healthData: "draft-2026-10-26",
} as const;

/** Shown on every policy page until a lawyer has reviewed the text. */
export const POLICIES_ARE_DRAFTS = true;

/** Placeholders the business must fill in (kept in one place so they're easy to find). */
export const LEGAL = {
  entity: "[Lanternway legal entity name]",
  address: "[mailing address]",
  privacyEmail: "[privacy contact email, e.g. privacy@lanternway.co]",
  governingLaw: "[state]",
  effectiveDate: "[effective date]",
} as const;
