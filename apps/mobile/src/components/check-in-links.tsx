/**
 * Teacher check-ins on the phone: recent check-ins, the links (status, revoke) and
 * "Ask for check-ins". A new link's token comes back once: the phone shows the link,
 * offers the share sheet, and doesn't keep it. The person who opens it sees a short
 * form with the child's first name, never the child's record (CLAUDE.md rule 4).
 */
import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import type { CheckInsResponse } from "@lanternway/shared/api";
import { addDays } from "@lanternway/shared/dates";
import { formatAverage, formatDate, formatShortDate, plural } from "@lanternway/shared/format";
import { summarizeCheckIns } from "@lanternway/shared/insights";
import { respondentRoleLabels } from "@lanternway/shared/labels";
import type { CheckInLink, IsoDate, RespondentRole } from "@lanternway/shared/types";
import { Badge, confirm, OptionCard, Section, Segmented, s as parts } from "@/components/screen-parts";
import { Sheet } from "@/components/sheet";
import { Button, Card, Checkbox, Field, Notice } from "@/components/ui";
import { createCheckInLink, revokeCheckInLink, websiteUrl } from "@/lib/api";
import { colors, fonts, radius } from "@/theme";

const LIFETIMES = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
] as const;

const linkUrl = (token: string) => websiteUrl(`/c/${token}`);

export function CheckIns({ data, childId, childName, today, isAdmin, onChanged }: {
  data: CheckInsResponse;
  childId: string;
  childName: string;
  today: IsoDate;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const recent = data.checkIns.filter((c) => c.date >= addDays(today, -27) && c.date <= today);
  const teacher = summarizeCheckIns(recent);
  const nameOf = (id: string) => data.respondents.find((r) => r.id === id)?.name ?? "Teacher";
  const roleOf = (id: string) => {
    const r = data.respondents.find((x) => x.id === id);
    return r ? respondentRoleLabels[r.role] : "";
  };
  const status = (l: CheckInLink) => (l.revokedAt ? "Revoked" : l.expiresAt.slice(0, 10) < today ? "Expired" : "Active");
  const links = [...data.links].sort((a, b) => Number(status(b) === "Active") - Number(status(a) === "Active"));

  async function revoke(l: CheckInLink) {
    const ok = await confirm(
      `Turn off ${nameOf(l.respondentId)}’s link?`,
      `It stops working right away. Check-ins they already sent stay in ${childName}’s record.`,
      "Turn off",
      true,
    );
    if (!ok) return;
    setProblem(null);
    const result = await revokeCheckInLink(l.id);
    if (!result.ok) setProblem(result.error);
    onChanged();
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={st.stats}>
        {(
          [
            ["Focus", teacher.focus],
            ["Mood", teacher.mood],
            ["Behavior", teacher.behavior],
            ["Participation", teacher.participation],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={st.stat} accessible accessibilityLabel={`${label}: ${formatAverage(value)} out of 5`}>
            <Text style={parts.rowMuted}>{label}</Text>
            <Text style={st.statValue}>
              {formatAverage(value)} <Text style={parts.rowMuted}>/ 5</Text>
            </Text>
          </View>
        ))}
      </View>
      <Text style={parts.rowMuted}>Averages from {plural(teacher.count, "check-in")} in the last 4 weeks.</Text>

      <Section>Check-in links</Section>
      <Text style={parts.rowMuted}>
        Each link is private to one person and only opens a short form. They never see {childName}’s record.
      </Text>
      {isAdmin && <Button label="Ask for check-ins" onPress={() => setAsking(true)} />}
      <Notice text={problem} />
      {links.length === 0 ? (
        <Card>
          <Text style={parts.cardTitle}>No check-in links yet.</Text>
          <Text style={parts.rowMuted}>
            {isAdmin
              ? `Send one to ${childName}’s teacher, aide, or therapist. They tap four ratings and an optional note, no account needed.`
              : `When a family admin sends one to ${childName}’s teacher, aide, or therapist, their check-ins will show here.`}
          </Text>
        </Card>
      ) : (
        links.map((l) => {
          const s = status(l);
          return (
            <Card key={l.id}>
              <View style={st.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={parts.rowTitle}>{nameOf(l.respondentId)}</Text>
                  <Text style={parts.rowMuted}>{roleOf(l.respondentId)}</Text>
                </View>
                <Badge text={s} tone={s === "Active" ? "selected" : "plain"} />
              </View>
              <Text style={st.small}>
                Created {formatDate(l.createdAt.slice(0, 10))} ·{" "}
                {s === "Revoked" ? "No longer works" : `${s === "Active" ? "Expires" : "Expired"} ${formatDate(l.expiresAt.slice(0, 10))}`}
                {l.lastUsedAt ? ` · Last check-in ${formatDate(l.lastUsedAt.slice(0, 10))}` : ""}
              </Text>
              {isAdmin && s === "Active" && <Button label="Revoke" kind="secondary" onPress={() => void revoke(l)} />}
            </Card>
          );
        })
      )}
      {links.length > 0 && (
        <Text style={st.small}>For privacy, Lanternway only shows a link once, when you create it. Lost one? Revoke it and make a new one.</Text>
      )}

      <Section>Recent check-ins</Section>
      {recent.length === 0 ? (
        <Text style={parts.rowMuted}>No check-ins in the last 4 weeks yet.</Text>
      ) : (
        [...recent].reverse().map((c) => (
          <Card key={c.id}>
            <View style={st.rowTop}>
              <Text style={parts.rowTitle}>{nameOf(c.respondentId)}</Text>
              <Text style={parts.rowMuted}>{formatShortDate(c.date)}</Text>
            </View>
            <Text style={parts.rowMuted}>
              Focus {c.ratings.focus} · Mood {c.ratings.mood} · Behavior {c.ratings.behavior} · Participation {c.ratings.participation}
            </Text>
            {c.note ? <Text style={st.text}>“{c.note}”</Text> : null}
          </Card>
        ))
      )}

      {asking && (
        <AskSheet
          childId={childId}
          childName={childName}
          respondents={data.respondents}
          onClose={() => {
            setAsking(false);
            onChanged();
          }}
        />
      )}
    </View>
  );
}

const roles = Object.keys(respondentRoleLabels) as RespondentRole[];

/** Pick or add a person, how long the link works, consent; then share the link (shown once). */
function AskSheet({ childId, childName, respondents, onClose }: {
  childId: string;
  childName: string;
  respondents: CheckInsResponse["respondents"];
  onClose: () => void;
}) {
  const [who, setWho] = useState<string>(respondents.at(-1)?.id ?? "new");
  const [name, setName] = useState("");
  const [role, setRole] = useState<RespondentRole>("classroom-teacher");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<(typeof LIFETIMES)[number]["value"]>("90");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; name: string } | null>(null);

  const existing = respondents.find((r) => r.id === who);
  const personName = existing?.name ?? name.trim();

  async function create() {
    if (!existing && !personName) return setError("Add the person’s name.");
    if (!consent) return setError(`Please confirm you’d like to ask ${personName} for check-ins about ${childName}.`);
    setError(null);
    setBusy(true);
    const result = await createCheckInLink(childId, {
      days: Number(days),
      ...(existing ? { respondentId: existing.id } : { respondent: { name: personName, role, email: email.trim() || undefined } }),
    });
    setBusy(false);
    if (result.ok) setCreated({ token: result.data.token, name: personName });
    else setError(result.status === 0 ? "You’re offline. Links can only be made while Lanternway is reachable." : result.error);
  }

  function share() {
    if (!created) return;
    const message = `Hi! Here's a private link for quick check-ins about ${childName}. It takes about 30 seconds: four ratings and an optional note, no account needed.\n\n${linkUrl(created.token)}\n\nThank you!`;
    void Share.share({ message }).catch(() => undefined);
  }

  if (created) {
    return (
      <Sheet title={`Link ready for ${created.name}`} onClose={onClose}>
        <Text style={parts.rowMuted}>Share it now and send it however you like. For privacy, Lanternway only shows it this once.</Text>
        <Text style={st.link} selectable>
          {linkUrl(created.token)}
        </Text>
        <Button label="Share the link" onPress={share} />
        <Text style={st.small}>
          {created.name} will only see a short form with {childName}’s first name. Never {childName}’s record.
        </Text>
        <Button label="Done" kind="secondary" onPress={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Ask for check-ins" onClose={onClose}>
      <Text style={parts.rowMuted}>
        A private link for one person. It opens a 30-second form about {childName}’s day: focus, mood, behavior, participation, and an
        optional note.
      </Text>
      {respondents.length > 0 && (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Who is it for?">
          <Text style={parts.rowTitle}>Who is it for?</Text>
          {respondents.map((r) => (
            <OptionCard key={r.id} title={r.name} hint={respondentRoleLabels[r.role]} selected={who === r.id} onPress={() => setWho(r.id)} />
          ))}
          <OptionCard title="Someone new" selected={who === "new"} onPress={() => setWho("new")} />
        </View>
      )}
      {who === "new" && (
        <>
          <Field label="Their name" value={name} onChangeText={setName} placeholder="e.g. Ms. Park" maxLength={80} autoCorrect={false} />
          <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Role">
            <Text style={parts.rowTitle}>Role</Text>
            {roles.map((r) => (
              <OptionCard key={r} title={respondentRoleLabels[r]} selected={role === r} onPress={() => setRole(r)} />
            ))}
          </View>
          <Field
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={120}
            hint="Saved with their name. Lanternway doesn’t email them."
          />
        </>
      )}
      <Text style={parts.rowTitle}>Link works for</Text>
      <Segmented label="Link works for" options={LIFETIMES} value={days} onChange={setDays} />
      <Text style={st.small}>You can revoke it any time.</Text>
      <Checkbox checked={consent} onChange={setConsent}>
        <Text style={st.text}>
          I’d like to ask this person for check-ins about {childName}. Their ratings and notes will be saved to {childName}’s record.
          They’ll see {childName}’s first name and nothing else.
        </Text>
      </Checkbox>
      <Notice text={error} />
      <Button label="Create link" busy={busy} busyLabel="Creating…" onPress={() => void create()} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "47%", flexGrow: 1, backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: 12 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.teal },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.teal,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.button,
    padding: 12,
  },
});
