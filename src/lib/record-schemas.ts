/**
 * Server-side validation for every kind of record saved to the database.
 *
 * Each kind lists exactly which fields it may have, with types and size limits.
 * Unknown fields are dropped, strings are trimmed and capped, numbers and dates are
 * checked, and enum values must be on the list. Anything that fails returns a plain
 * message instead of being saved. Mirrors the types in src/lib/types.ts.
 */

type Spec =
  | { t: "str"; max: number; optional?: boolean }
  | { t: "date"; optional?: boolean }
  | { t: "time"; optional?: boolean }
  | { t: "num"; min: number; max: number; int?: boolean; optional?: boolean }
  | { t: "enum"; values: readonly string[]; optional?: boolean }
  | { t: "uuid"; optional?: boolean }
  | { t: "list"; of: Spec; max: number }
  | { t: "obj"; fields: Record<string, Spec>; optional?: boolean };

const str = (max: number, optional = false): Spec => ({ t: "str", max, optional });
const ostr = (max: number): Spec => str(max, true);
const date = (optional = false): Spec => ({ t: "date", optional });
const num = (min: number, max: number, int = false, optional = false): Spec => ({ t: "num", min, max, int, optional });
const oneOf = (values: readonly string[], optional = false): Spec => ({ t: "enum", values, optional });
const uuid = (optional = false): Spec => ({ t: "uuid", optional });
const list = (of: Spec, max: number): Spec => ({ t: "list", of, max });
const obj = (fields: Record<string, Spec>, optional = false): Spec => ({ t: "obj", fields, optional });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function clean(spec: Spec, value: unknown, path: string): unknown {
  const missing = value === undefined || value === null || value === "";
  if (missing) {
    if ("optional" in spec && spec.optional) return undefined;
    if (spec.t === "list") return [];
    if (spec.t === "str") return "";
    throw new Error(`${path} is missing`);
  }
  switch (spec.t) {
    case "str":
      if (typeof value !== "string" && typeof value !== "number") throw new Error(`${path} should be text`);
      return String(value).trim().slice(0, spec.max);
    case "date":
      if (typeof value !== "string" || !isDate(value)) throw new Error(`${path} should be a date`);
      return value;
    case "time":
      if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) throw new Error(`${path} should be a time`);
      return value;
    case "num": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n) || n < spec.min || n > spec.max || (spec.int && !Number.isInteger(n))) throw new Error(`${path} is out of range`);
      return n;
    }
    case "enum":
      if (typeof value !== "string" || !spec.values.includes(value)) throw new Error(`${path} isn't an allowed value`);
      return value;
    case "uuid":
      if (typeof value !== "string" || !UUID.test(value)) throw new Error(`${path} should be an id`);
      return value.toLowerCase();
    case "list":
      if (!Array.isArray(value)) throw new Error(`${path} should be a list`);
      return value.slice(0, spec.max).map((v, i) => clean(spec.of, v, `${path}[${i}]`));
    case "obj": {
      if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} should be an object`);
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, s] of Object.entries(spec.fields)) {
        const v = clean(s, src[k], `${path}.${k}`);
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
  }
}

const rating = num(1, 5, true);
const logBase = { childId: uuid(), date: date(), time: { t: "time", optional: true } as Spec, loggedBy: ostr(60) };

/** Log entries are a tagged union on `kind`. */
const logSpecs: Record<string, Record<string, Spec>> = {
  mood: { ...logBase, kind: oneOf(["mood"]), rating, note: ostr(500) },
  sleep: {
    ...logBase,
    kind: oneOf(["sleep"]),
    hours: num(0, 24),
    bedtime: { t: "time" },
    wakeTime: { t: "time" },
    nightWakings: num(0, 30, true),
    quality: rating,
    note: ostr(500),
  },
  appetite: { ...logBase, kind: oneOf(["appetite"]), rating, note: ostr(500) },
  meltdown: {
    ...logBase,
    kind: oneOf(["meltdown"]),
    trigger: str(120),
    intensity: rating,
    durationMinutes: num(0, 600, true),
    whatHelped: list(str(120), 12),
    note: ostr(500),
  },
  win: { ...logBase, kind: oneOf(["win"]), text: str(500) },
  note: { ...logBase, kind: oneOf(["note"]), text: str(1000) },
};

/** Fields per collection. `parent` names the field that links to the parent record. */
export const RECORD_KINDS = {
  logs: { kind: "log", date: "date", parent: null, fields: null },
  milestones: {
    kind: "milestone",
    date: "date",
    parent: null,
    fields: {
      childId: uuid(),
      date: date(),
      category: oneOf(["development", "diagnosis", "therapy", "school", "medication", "life"]),
      title: str(120),
      description: ostr(500),
    },
  },
  medications: {
    kind: "medication",
    date: "startDate",
    parent: null,
    fields: {
      childId: uuid(),
      name: str(120),
      purpose: ostr(200),
      form: ostr(60),
      prescriberId: ostr(80),
      prescriberName: ostr(80),
      startDate: date(),
      stopDate: date(true),
      pharmacy: ostr(120),
      lastFilledOn: date(true),
      daysSupply: num(1, 400, true, true),
    },
  },
  medicationChanges: {
    kind: "medication_change",
    date: "date",
    parent: "medicationId",
    fields: {
      medicationId: uuid(),
      date: date(),
      type: oneOf(["start", "dose-change", "stop"]),
      doseMg: num(0, 100000),
      schedule: str(120),
      reason: ostr(500),
      sideEffectsObserved: list(str(200), 12),
      notes: ostr(500),
    },
  },
  providers: {
    kind: "provider",
    date: "startDate",
    parent: null,
    fields: {
      childId: uuid(),
      type: oneOf(["aba", "speech", "ot", "pt", "feeding", "counseling", "psychiatry", "pediatrics"]),
      name: str(120),
      credentials: ostr(60),
      practice: ostr(120),
      phone: ostr(40),
      email: ostr(120),
      schedule: ostr(120),
      startDate: date(),
      endDate: date(true),
    },
  },
  therapyGoals: {
    kind: "therapy_goal",
    date: "startDate",
    parent: "providerId",
    fields: {
      providerId: uuid(),
      title: str(160),
      description: ostr(600),
      startDate: date(),
      status: oneOf(["active", "met", "paused", "ended"]),
      progress: list(obj({ date: date(), percent: num(0, 100), note: ostr(300) }), 200),
    },
  },
  therapySessions: {
    kind: "therapy_session",
    date: "date",
    parent: "providerId",
    fields: {
      providerId: uuid(),
      date: date(),
      durationMinutes: num(0, 600, true),
      goalIds: list(uuid(), 20),
      summary: ostr(1000),
      practiceAtHome: ostr(500),
    },
  },
  iepPlans: {
    kind: "iep_plan",
    date: "startDate",
    parent: null,
    fields: {
      childId: uuid(),
      type: oneOf(["iep", "504"]),
      school: str(120),
      grade: ostr(40),
      startDate: date(),
      annualReviewDate: date(),
      reevaluationDate: date(),
      caseManager: ostr(80),
      team: list(obj({ name: str(80), role: ostr(80), email: ostr(120) }), 30),
    },
  },
  iepGoals: {
    kind: "iep_goal",
    date: null,
    parent: "planId",
    fields: {
      planId: uuid(),
      area: str(80),
      description: str(800),
      baseline: ostr(200),
      target: ostr(200),
      unit: ostr(60),
      targetValue: num(0, 100),
      progress: list(obj({ date: date(), value: num(0, 100), reportedBy: ostr(80), note: ostr(300) }), 200),
    },
  },
  accommodations: {
    kind: "accommodation",
    date: null,
    parent: "planId",
    fields: {
      planId: uuid(),
      kind: oneOf(["accommodation", "service"]),
      title: str(120),
      details: ostr(600),
      frequency: ostr(80),
      provider: ostr(120),
      deliveryLog: list(obj({ date: date(), status: oneOf(["delivered", "partial", "missed"]), note: ostr(300) }), 400),
    },
  },
  schoolMessages: {
    kind: "school_message",
    date: "date",
    parent: null,
    fields: {
      childId: uuid(),
      date: date(),
      type: oneOf(["email", "call", "meeting", "note-home", "portal"]),
      direction: oneOf(["from-school", "to-school", "both"]),
      person: ostr(80),
      role: ostr(80),
      subject: str(200),
      summary: ostr(2000),
      attachments: list(obj({ name: str(160) }), 20),
    },
  },
} as const;

export type RecordCollection = keyof typeof RECORD_KINDS;
export const isRecordCollection = (c: string): c is RecordCollection => c in RECORD_KINDS;

/** Validate a record. Returns the cleaned data (without id) or a problem message. */
export function cleanRecord(collection: RecordCollection, item: unknown): Record<string, unknown> | string {
  try {
    const spec = RECORD_KINDS[collection];
    if (collection === "logs") {
      const kind = (item as { kind?: unknown })?.kind;
      const fields = typeof kind === "string" ? logSpecs[kind] : undefined;
      if (!fields) return "That kind of log isn't supported.";
      return clean(obj(fields), item, "log") as Record<string, unknown>;
    }
    return clean(obj(spec.fields as Record<string, Spec>), item, collection) as Record<string, unknown>;
  } catch (err) {
    return err instanceof Error ? `Couldn't save: ${err.message}.` : "Couldn't save that.";
  }
}
