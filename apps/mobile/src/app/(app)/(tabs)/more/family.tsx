import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import type { FamiliesResponse } from "@lanternway/shared/api";
import { roleDescriptions, roleLabels, type Family, type FamilyMember, type FamilyRole } from "@lanternway/shared/family-roles";
import { formatDate } from "@lanternway/shared/format";
import { Badge, confirm, OptionCard, Page, Segmented, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Sheet } from "@/components/sheet";
import { Body, Button, Card, Checkbox, Field, Notice } from "@/components/ui";
import { cancelInvite, createInvite, getFamilies, removeMember, setMemberRole, websiteUrl } from "@/lib/api";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, radius } from "@/theme";

const ROLE_ORDER: FamilyRole[] = ["view", "log", "admin"];
const DAYS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
] as const;

const inviteUrl = (token: string) => websiteUrl(`/join/${token}`);
const kidNames = (kids: string[]) => (kids.length <= 1 ? (kids[0] ?? "") : `${kids.slice(0, -1).join(", ")} and ${kids.at(-1)}`);
const familyTitle = (f: Family) => (f.kids.length ? `${kidNames(f.kids)}’s family` : "Your family");
const nameOf = (m: FamilyMember) => m.name || m.email || "Family member";
// The account list isn't per child; the cache key needs a stable "child".
const fetchFamilies = () => getFamilies();

/** Family sharing: who can see the family's records, what they can do, invites, and leaving. The server enforces every role. */
export default function FamilySharing() {
  const { session, refreshMe } = useSession();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, savedAt, offline, refreshing, refresh, reload } = useCachedScreen<FamiliesResponse>("families", userId, "account", fetchFamilies);

  const changed = async () => {
    await Promise.all([reload(), refreshMe()]);
  };

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh(refreshMe)}>
      <Text style={parts.title} accessibilityRole="header">
        Family sharing
      </Text>
      <Body muted center={false}>Invite people who help care for your child. Each person gets their own sign-in.</Body>
      {!data ? (
        <Card>
          <Body muted>{offline ? "Family sharing shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : data.families.length === 0 ? (
        <Card>
          <Text style={parts.cardTitle}>Add a child first.</Text>
          <Text style={parts.rowMuted}>Once your child is set up on the Lanternway website, you can invite family members to see their records.</Text>
        </Card>
      ) : (
        data.families.map((f) => <FamilyCard key={f.id} family={f} offline={offline} onChanged={changed} />)
      )}
      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}

function FamilyCard({ family, offline, onChanged }: { family: Family; offline: boolean; onChanged: () => Promise<void> }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const isAdmin = family.myRole === "admin";
  const admins = family.members.filter((m) => m.role === "admin").length;
  const today = phoneToday();
  const openInvites = family.invites.filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt.slice(0, 10) >= today);
  const kids = kidNames(family.kids);

  async function run(job: () => Promise<{ ok: boolean; status?: number; error?: string }>) {
    setProblem(null);
    setBusy(true);
    const result = await job();
    setBusy(false);
    if (!result.ok) setProblem(result.status === 0 ? "You’re offline. Please try again once Lanternway is reachable." : (result.error ?? "Something went wrong."));
    await onChanged();
  }

  async function changeRole(m: FamilyMember, role: FamilyRole) {
    setEditing(null);
    if (role === m.role) return;
    if (role === "admin" && !(await confirm(`Make ${nameOf(m)} an admin?`, "They’ll be able to invite and remove people, and delete records.", "Make admin"))) return;
    await run(() => setMemberRole(family.id, m.userId, role));
  }

  async function remove(m: FamilyMember) {
    const ok = m.isMe
      ? await confirm(`Leave ${familyTitle(family)}?`, `You’ll stop seeing ${kids ? `${kids}’s` : "their"} records right away.`, "Leave", true)
      : await confirm(`Remove ${nameOf(m)}?`, `They’ll stop seeing ${kids ? `${kids}’s` : "the family’s"} records right away.`, "Remove", true);
    if (ok) await run(() => removeMember(family.id, m.userId));
  }

  return (
    <Card>
      <View style={st.top}>
        <View style={{ flex: 1 }}>
          <Text style={parts.cardTitle} accessibilityRole="header">
            {familyTitle(family)}
          </Text>
          <Text style={parts.rowMuted}>You: {roleLabels[family.myRole]}</Text>
        </View>
      </View>
      {isAdmin && <Button label="Invite someone" onPress={() => setInviting(true)} />}
      <Notice text={problem} />

      {family.members.map((m) => {
        const lastAdmin = m.role === "admin" && admins === 1;
        return (
          <View key={m.userId} style={st.member}>
            <View style={st.top}>
              <View style={{ flex: 1 }}>
                <Text style={parts.rowTitle}>
                  {nameOf(m)} {m.isMe ? <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>(you)</Text> : null}
                </Text>
                {m.name && m.email ? <Text style={parts.rowMuted}>{m.email}</Text> : null}
              </View>
              <Badge text={roleLabels[m.role]} tone={m.role === "admin" ? "selected" : "plain"} />
            </View>
            {editing?.userId === m.userId ? (
              <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={`What ${nameOf(m)} can do`}>
                {ROLE_ORDER.map((r) => (
                  <OptionCard key={r} title={roleLabels[r]} hint={roleDescriptions[r]} selected={m.role === r} onPress={() => void changeRole(m, r)} />
                ))}
                <Button label="Cancel" kind="secondary" onPress={() => setEditing(null)} />
              </View>
            ) : (
              <View style={st.actions}>
                {isAdmin && !m.isMe && !lastAdmin && (
                  <View style={{ flex: 1 }}>
                    <Button label="Change role" kind="secondary" busy={busy} onPress={() => setEditing(m)} />
                  </View>
                )}
                {isAdmin && !m.isMe && (
                  <View style={{ flex: 1 }}>
                    <Button label="Remove" kind="secondary" busy={busy} onPress={() => void remove(m)} />
                  </View>
                )}
                {m.isMe && family.members.length > 1 && !lastAdmin && (
                  <View style={{ flex: 1 }}>
                    <Button label="Leave" kind="secondary" busy={busy} onPress={() => void remove(m)} />
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
      {isAdmin && admins === 1 && family.members.length > 1 && (
        <Text style={st.small}>You’re the only admin. To leave or delete your account, make someone else an admin first.</Text>
      )}
      {family.members.length === 1 && isAdmin && (
        <Text style={parts.rowMuted}>Only you so far. Invite someone who helps care for {kids || "your child"}.</Text>
      )}

      {isAdmin && openInvites.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={parts.rowTitle}>Waiting to join</Text>
          {openInvites.map((i) => (
            <View key={i.id} style={st.member}>
              <Text style={parts.rowTitle}>{i.label}</Text>
              <Text style={parts.rowMuted}>
                {roleLabels[i.role]} · link expires {formatDate(i.expiresAt.slice(0, 10))}
              </Text>
              <Button
                label="Revoke"
                kind="secondary"
                busy={busy}
                onPress={() =>
                  void (async () => {
                    if (await confirm(`Turn off ${i.label}’s invite?`, "The link stops working right away.", "Turn off", true)) {
                      await run(() => cancelInvite(family.id, i.id));
                    }
                  })()
                }
              />
            </View>
          ))}
          <Text style={st.small}>For privacy, Lanternway only shows an invite link once. Lost one? Revoke it and make a new one.</Text>
        </View>
      )}

      {inviting && (
        <InviteSheet
          family={family}
          offline={offline}
          onClose={() => {
            setInviting(false);
            void onChanged();
          }}
        />
      )}
    </Card>
  );
}

/** Name, role, how long the link works, consent; then share the link (shown once). */
function InviteSheet({ family, offline, onClose }: { family: Family; offline: boolean; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<FamilyRole>("view");
  const [days, setDays] = useState<(typeof DAYS)[number]["value"]>("7");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; label: string; role: FamilyRole; days: string } | null>(null);
  const kids = kidNames(family.kids) || "your child";

  async function create() {
    const name = label.trim();
    if (!name) return setError("Add the person’s name.");
    if (!consent) return setError(`Please confirm you’d like ${name} to see ${kids}’s records.`);
    setError(null);
    setBusy(true);
    const result = await createInvite(family.id, { label: name, role, days: Number(days) });
    setBusy(false);
    if (result.ok) setCreated({ token: result.data.token, label: name, role, days });
    else setError(result.status === 0 || offline ? "You’re offline. Invites can only be made while Lanternway is reachable." : result.error);
  }

  if (created) {
    const message = `Hi! I'm using Lanternway to keep track of ${kids}'s logs, medications, therapy and school. Here's a private invite so you can see them too:\n\n${inviteUrl(created.token)}\n\nThe link works once and expires in ${created.days} days.`;
    return (
      <Sheet title={`Invite ready for ${created.label}`} onClose={onClose}>
        <Text style={parts.rowMuted}>Share it now and send it however you like. For privacy, Lanternway only shows it this once.</Text>
        <Text style={st.link} selectable>
          {inviteUrl(created.token)}
        </Text>
        <Button label="Share the invite" onPress={() => void Share.share({ message }).catch(() => undefined)} />
        <Text style={st.small}>
          The link works once. Whoever opens it signs in (or creates an account) and joins as “{roleLabels[created.role]}”. Send it only to{" "}
          {created.label}.
        </Text>
        <Button label="Done" kind="secondary" onPress={onClose} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Invite someone" onClose={onClose}>
      <Text style={parts.rowMuted}>They get their own sign-in. You can change what they can do, or remove them, anytime.</Text>
      <Field label="Their name" value={label} onChangeText={setLabel} placeholder="e.g. Grandma Jo" maxLength={80} autoCorrect={false} />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="What they can do">
        <Text style={parts.rowTitle}>What they can do</Text>
        {ROLE_ORDER.map((r) => (
          <OptionCard key={r} title={roleLabels[r]} hint={roleDescriptions[r]} selected={role === r} onPress={() => setRole(r)} />
        ))}
      </View>
      <Text style={parts.rowTitle}>Link works for</Text>
      <Segmented label="Link works for" options={DAYS} value={days} onChange={setDays} />
      <Text style={st.small}>It works once, and you can revoke it before then.</Text>
      <Checkbox checked={consent} onChange={setConsent}>
        <Text style={st.text}>
          I’d like this person to see {kids}’s records in Lanternway: daily logs, medications, therapy, school, About Me, and teacher check-ins.
        </Text>
      </Checkbox>
      <Notice text={error} />
      <Button label="Create invite link" busy={busy} busyLabel="Creating…" onPress={() => void create()} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  member: { backgroundColor: colors.white, borderRadius: radius.button, padding: 12, gap: 8 },
  actions: { flexDirection: "row", gap: 8 },
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
