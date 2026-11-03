import { router } from "expo-router";
import type { ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { ChildResponse } from "@lanternway/shared/api";
import { ageOn } from "@lanternway/shared/dates";
import { formatDate } from "@lanternway/shared/format";
import { communicationStyleLabels } from "@lanternway/shared/labels";
import { telHref } from "@lanternway/shared/refills";
import { Page, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Card } from "@/components/ui";
import { listSections, type EditSection } from "@/lib/about-me";
import { getChild } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, minTap, radius } from "@/theme";

/** About Me: everything someone new should know, with an Edit button on each section for admins. */
export default function AboutMe() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<ChildResponse>("child", userId, current?.child.id ?? null, getChild);

  if (!current) return null;
  const child = data?.child ?? current.child;
  const canEdit = current.role === "admin";
  const edit = (section: EditSection) => router.push({ pathname: "/more/about-me/edit", params: { section } });
  const action = (section: EditSection, what: string) => (canEdit ? <EditButton what={what} onPress={() => edit(section)} /> : null);
  const list = (items: string[], empty = "Nothing added yet.") =>
    items.length ? items.map((i) => <Text key={i} style={st.item}>{i}</Text>) : <Text style={parts.rowMuted}>{empty}</Text>;

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh(refreshMe)}>
      <View style={st.hero}>
        <Text style={st.kicker}>ALL ABOUT ME</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[parts.title, { flex: 1 }]} accessibilityRole="header">
            {child.firstName}
          </Text>
          {action("basics", "name, birthday and intro")}
        </View>
        <View style={st.facts}>
          <Text style={st.fact}>Age {ageOn(child.birthDate, phoneToday())}</Text>
          {child.pronouns ? <Text style={st.fact}>{child.pronouns}</Text> : null}
          {child.school?.grade ? <Text style={st.fact}>{child.school.grade}</Text> : null}
          <Text style={st.fact}>Birthday {formatDate(child.birthDate).replace(/, \d{4}$/, "")}</Text>
        </View>
        {child.aboutMe ? (
          <View style={st.quote}>
            <Text style={st.text}>{child.aboutMe}</Text>
            <Text style={st.small}>In {child.firstName}’s words</Text>
          </View>
        ) : null}
      </View>
      {!canEdit && <Text style={parts.rowMuted}>Family admins can change About Me.</Text>}

      <Box title="How I communicate" action={action("communication", "How I communicate")}>
        <Text style={st.pill}>{communicationStyleLabels[child.communicationStyle]}</Text>
        <Text style={st.text}>{child.communicationNotes || "Add tips for talking together."}</Text>
      </Box>

      {listSections.map((sec) => (
        <Box key={sec.field} title={sec.title} action={action(sec.field, sec.title)}>
          {list(child[sec.field], sec.empty?.(child.firstName))}
        </Box>
      ))}

      <Text style={[parts.section, { marginTop: 12 }]} accessibilityRole="header">
        Health and safety
      </Text>
      <Text style={parts.rowMuted}>Private. Only shared when you choose to include it.</Text>

      <Box title="Diagnoses" action={action("diagnoses", "Diagnoses")}>
        {child.diagnoses.length === 0 ? (
          <Text style={parts.rowMuted}>None recorded.</Text>
        ) : (
          child.diagnoses.map((d) => (
            <Text key={d.name} style={st.item}>
              <Text style={{ fontFamily: fonts.bold }}>{d.name}</Text>
              <Text style={{ color: colors.muted }}>
                {" "}
                · {formatDate(d.diagnosedOn)}
                {d.diagnosedBy ? `, ${d.diagnosedBy}` : ""}
              </Text>
            </Text>
          ))
        )}
        {child.aboutMeHealth ? (
          <Text style={st.text}>
            <Text style={{ fontFamily: fonts.bold }}>In {child.firstName}’s words: </Text>
            {child.aboutMeHealth}
          </Text>
        ) : null}
      </Box>

      <Box title="Medications">
        <Pressable onPress={() => router.push("/more/medications")} accessibilityRole="button" style={st.linkRow}>
          <Text style={st.linkText}>See Medications</Text>
        </Pressable>
      </Box>

      <Box title="Allergies" action={action("allergies", "Allergies")}>
        {list(child.allergies, "None recorded.")}
      </Box>

      <Box title="Emergency contacts" action={action("contacts", "Emergency contacts")}>
        {child.emergencyContacts.length === 0 ? (
          <Text style={parts.rowMuted}>None added yet.</Text>
        ) : (
          child.emergencyContacts.map((c) => (
            <Pressable
              key={`${c.name}-${c.phone}`}
              onPress={() => void Linking.openURL(telHref(c.phone)).catch(() => undefined)}
              accessibilityRole="button"
              accessibilityHint={`Calls ${c.name}`}
              style={st.contact}
            >
              <Text style={parts.rowTitle}>
                {c.name}
                {c.relationship ? <Text style={{ fontFamily: fonts.regular, color: colors.muted }}> · {c.relationship}</Text> : null}
              </Text>
              <Text style={parts.rowMuted}>{c.phone}</Text>
            </Pressable>
          ))
        )}
      </Box>

      {!data && offline ? <Body muted>Showing what this phone has. Pull down to refresh once you’re online.</Body> : null}
      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}

function Box({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={[parts.cardTitle, { flex: 1 }]} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </Card>
  );
}

function EditButton({ what, onPress }: { what: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Edit ${what}`} style={st.edit} hitSlop={6}>
      <Text style={st.editText}>Edit</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: "rgba(247,179,65,0.22)", borderRadius: 24, padding: 18, gap: 10, borderWidth: 1, borderColor: colors.border },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, color: colors.teal },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fact: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.teal,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  quote: { backgroundColor: colors.white, borderRadius: radius.card, padding: 14, gap: 6 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.teal },
  small: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  item: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal, backgroundColor: colors.white, borderRadius: 12, padding: 10, overflow: "hidden" },
  pill: {
    alignSelf: "flex-start",
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.paper,
    backgroundColor: colors.teal,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: "hidden",
  },
  edit: { minHeight: minTap, minWidth: minTap, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  editText: { fontFamily: fonts.bold, fontSize: 15, color: colors.teal },
  contact: { backgroundColor: colors.white, borderRadius: 12, padding: 10, minHeight: minTap },
  linkRow: { minHeight: minTap, justifyContent: "center" },
  linkText: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal, textDecorationLine: "underline" },
});
