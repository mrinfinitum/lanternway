import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChildResponse } from "@lanternway/shared/api";
import { communicationStyleLabels } from "@lanternway/shared/labels";
import type { Child, CommunicationStyle } from "@lanternway/shared/types";
import { OptionCard, s as parts } from "@/components/screen-parts";
import { Body, Button, Card, Field, Notice, Screen } from "@/components/ui";
import { allergiesSection, isEditSection, isListField, listSections, type EditSection, type ListField } from "@/lib/about-me";
import { getChild, saveChild } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, minTap, radius } from "@/theme";

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const DATE_HINT = "As year-month-day, for example 2019-04-21. A rough date is fine.";

/**
 * Edit one About Me section. Saves the whole profile (PATCH, admins); the server
 * checks every field. Profile edits need a connection: nothing is queued.
 */
export default function EditAboutMe() {
  const params = useLocalSearchParams<{ section?: string }>();
  const section: EditSection = isEditSection(params.section) ? params.section : "basics";
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, reload } = useCachedScreen<ChildResponse>("child", userId, current?.child.id ?? null, getChild);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!current) return null;
  const child = data?.child ?? current.child;

  async function save(next: Child) {
    setError(null);
    setBusy(true);
    const result = await saveChild(next);
    setBusy(false);
    if (!result.ok) {
      return setError(result.status === 0 ? "You’re offline. About Me changes save once Lanternway is reachable, so please try again then." : result.error);
    }
    await Promise.all([reload(), refreshMe()]);
    router.back();
  }

  const title =
    section === "basics"
      ? `${child.firstName}’s basics`
      : section === "communication"
        ? "How I communicate"
        : section === "diagnoses"
          ? "Diagnoses"
          : section === "contacts"
            ? "Emergency contacts"
            : (listSections.find((s) => s.field === section) ?? allergiesSection).title;

  return (
    <Screen header>
      <Stack.Screen options={{ title }} />
      {current.role !== "admin" ? (
        <Card>
          <Body>Family admins can change {child.firstName}’s About Me.</Body>
        </Card>
      ) : (
        <Card>
          {section === "basics" && <BasicsForm child={child} busy={busy} onSave={save} onError={setError} />}
          {section === "communication" && <CommunicationForm child={child} busy={busy} onSave={save} />}
          {isListField(section) && <ListForm child={child} field={section} busy={busy} onSave={save} />}
          {section === "diagnoses" && <DiagnosesForm child={child} busy={busy} onSave={save} onError={setError} />}
          {section === "contacts" && <ContactsForm child={child} busy={busy} onSave={save} onError={setError} />}
          <Notice text={error} />
        </Card>
      )}
    </Screen>
  );
}

type FormProps = { child: Child; busy: boolean; onSave: (next: Child) => Promise<void> };
type CheckedFormProps = FormProps & { onError: (message: string | null) => void };

function SaveButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return <Button label="Save" busy={busy} busyLabel="Saving…" onPress={onPress} />;
}

function BasicsForm({ child, busy, onSave, onError }: CheckedFormProps) {
  const [firstName, setFirstName] = useState(child.firstName);
  const [pronouns, setPronouns] = useState(child.pronouns ?? "");
  const [birthDate, setBirthDate] = useState(child.birthDate);
  const [aboutMe, setAboutMe] = useState(child.aboutMe);
  const [aboutMeHealth, setAboutMeHealth] = useState(child.aboutMeHealth ?? "");
  return (
    <View style={{ gap: 16 }}>
      <Text style={parts.rowMuted}>The intro is shared in every summary, so keep health details in the private note below it.</Text>
      <Field label="First name" value={firstName} onChangeText={setFirstName} autoCorrect={false} />
      <Field label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="e.g. she/her" autoCapitalize="none" />
      <Field label="Birthday" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" maxLength={10} hint="As year-month-day, for example 2017-03-09." />
      <Field label="Intro, in their words" value={aboutMe} onChangeText={setAboutMe} multiline style={st.multi} hint="e.g. “Hi! I'm Maya. I love horses…” Shared in every summary." />
      <Field
        label="Private note about diagnoses"
        value={aboutMeHealth}
        onChangeText={setAboutMeHealth}
        multiline
        style={st.multi}
        hint="Only added to a shared summary when you include Diagnoses."
      />
      <SaveButton
        busy={busy}
        onPress={() => {
          if (!firstName.trim()) return onError("Please add a first name.");
          if (!isDate(birthDate)) return onError("Please add a birthday as year-month-day, for example 2017-03-09.");
          if (birthDate > phoneToday()) return onError("The birthday can’t be in the future.");
          void onSave({
            ...child,
            firstName: firstName.trim(),
            pronouns: pronouns.trim() || undefined,
            birthDate,
            aboutMe: aboutMe.trim(),
            aboutMeHealth: aboutMeHealth.trim() || undefined,
          });
        }}
      />
    </View>
  );
}

const styles = Object.keys(communicationStyleLabels) as CommunicationStyle[];

function CommunicationForm({ child, busy, onSave }: FormProps) {
  const [style, setStyle] = useState(child.communicationStyle);
  const [notes, setNotes] = useState(child.communicationNotes);
  return (
    <View style={{ gap: 16 }}>
      <Text style={parts.rowMuted}>Help someone new talk with them in the first five minutes.</Text>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Mostly communicates by">
        <Text style={parts.rowTitle}>Mostly communicates by</Text>
        {styles.map((s) => (
          <OptionCard key={s} title={communicationStyleLabels[s]} selected={style === s} onPress={() => setStyle(s)} />
        ))}
      </View>
      <Field
        label="Tips for talking together"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={st.multi}
        hint="What works, what to avoid, how they show they need something."
      />
      <SaveButton busy={busy} onPress={() => void onSave({ ...child, communicationStyle: style, communicationNotes: notes.trim() })} />
    </View>
  );
}

/** Rows of text that can be added, reworded or removed. */
function Rows<T extends Record<string, string>>({ rows, setRows, columns, itemLabel, empty }: {
  rows: T[];
  setRows: (rows: T[]) => void;
  columns: { key: keyof T & string; label: string; placeholder?: string; keyboard?: "phone-pad" | "numbers-and-punctuation"; hint?: string }[];
  itemLabel: string;
  empty: T;
}) {
  const update = (i: number, key: keyof T, value: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, i) => (
        <View key={i} style={st.row}>
          <View style={{ flex: 1, gap: 8 }}>
            {columns.map((c) => (
              <Field
                key={c.key}
                label={columns.length > 1 ? c.label : `${itemLabel} ${i + 1}`}
                value={row[c.key]}
                onChangeText={(v) => update(i, c.key, v)}
                placeholder={c.placeholder}
                keyboardType={c.keyboard}
                hint={c.hint}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setRows(rows.filter((_, j) => j !== i))}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
            style={st.remove}
          >
            <Text style={st.removeText}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Button label={`Add ${itemLabel.toLowerCase()}`} kind="secondary" onPress={() => setRows([...rows, { ...empty }])} />
    </View>
  );
}

function ListForm({ child, field, busy, onSave }: FormProps & { field: ListField }) {
  const sec = listSections.find((s) => s.field === field) ?? allergiesSection;
  const [rows, setRows] = useState(() => (child[field].length ? child[field] : [""]).map((item) => ({ item })));
  return (
    <View style={{ gap: 16 }}>
      <Text style={parts.rowMuted}>Add, reword, or remove. Short and specific works best.</Text>
      <Rows rows={rows} setRows={setRows} columns={[{ key: "item", label: sec.itemLabel, placeholder: sec.placeholder }]} itemLabel={sec.itemLabel} empty={{ item: "" }} />
      <SaveButton busy={busy} onPress={() => void onSave({ ...child, [field]: [...new Set(rows.map((r) => r.item.trim()).filter(Boolean))] })} />
    </View>
  );
}

function DiagnosesForm({ child, busy, onSave, onError }: CheckedFormProps) {
  const [rows, setRows] = useState(() =>
    child.diagnoses.map((d) => ({ name: d.name, diagnosedOn: d.diagnosedOn, diagnosedBy: d.diagnosedBy ?? "" })),
  );
  return (
    <View style={{ gap: 16 }}>
      <Text style={parts.rowMuted}>Private. Only shared when you turn Diagnoses on.</Text>
      <Rows
        rows={rows}
        setRows={setRows}
        itemLabel="Diagnosis"
        empty={{ name: "", diagnosedOn: "", diagnosedBy: "" }}
        columns={[
          { key: "name", label: "Diagnosis" },
          { key: "diagnosedOn", label: "When", keyboard: "numbers-and-punctuation", hint: DATE_HINT },
          { key: "diagnosedBy", label: "By (optional)" },
        ]}
      />
      <SaveButton
        busy={busy}
        onPress={() => {
          const kept = rows.map((r) => ({ name: r.name.trim(), diagnosedOn: r.diagnosedOn.trim(), diagnosedBy: r.diagnosedBy.trim() })).filter((r) => r.name);
          for (const r of kept) {
            if (!isDate(r.diagnosedOn)) return onError(`Please add when “${r.name}” was diagnosed, as year-month-day. A rough date is fine.`);
            if (r.diagnosedOn > phoneToday()) return onError("A diagnosis date can’t be in the future.");
          }
          void onSave({
            ...child,
            diagnoses: kept.map((r) => {
              const existing = child.diagnoses.find((d) => d.name === r.name);
              return {
                ...existing,
                name: r.name,
                tag: existing?.tag ?? r.name.toLowerCase().split(/[^a-z]+/)[0],
                diagnosedOn: r.diagnosedOn,
                diagnosedBy: r.diagnosedBy || undefined,
              };
            }),
          });
        }}
      />
    </View>
  );
}

function ContactsForm({ child, busy, onSave, onError }: CheckedFormProps) {
  const [rows, setRows] = useState(() => child.emergencyContacts.map((c) => ({ name: c.name, relationship: c.relationship, phone: c.phone })));
  return (
    <View style={{ gap: 16 }}>
      <Text style={parts.rowMuted}>Private. Only shared when you turn Emergency contacts on.</Text>
      <Rows
        rows={rows}
        setRows={setRows}
        itemLabel="Contact"
        empty={{ name: "", relationship: "", phone: "" }}
        columns={[
          { key: "name", label: "Name" },
          { key: "relationship", label: "Relationship" },
          { key: "phone", label: "Phone", keyboard: "phone-pad" },
        ]}
      />
      <SaveButton
        busy={busy}
        onPress={() => {
          const kept = rows.map((r) => ({ name: r.name.trim(), relationship: r.relationship.trim(), phone: r.phone.trim() })).filter((r) => r.name);
          const missing = kept.find((r) => !r.phone);
          if (missing) return onError(`Please add a phone number for ${missing.name}.`);
          void onSave({ ...child, emergencyContacts: kept });
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  multi: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: colors.white, borderRadius: radius.button, padding: 10 },
  remove: { width: minTap, height: minTap, borderRadius: minTap / 2, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center", marginTop: 26 },
  removeText: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
});
