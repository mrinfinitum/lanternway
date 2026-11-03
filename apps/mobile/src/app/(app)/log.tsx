import * as Crypto from "expo-crypto";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { appetiteLabels, intensityLabels, logKindLabels, moodLabels, sleepQualityLabels } from "@lanternway/shared/labels";
import type { LogKind, Rating } from "@lanternway/shared/types";
import { Chips, RatingPicker, Stepper } from "@/components/log-controls";
import { Body, Button, Card, Field, Notice, Screen, styles, Title } from "@/components/ui";
import { canLog, useCurrentChild } from "@/lib/current-child";
import { isLogKind, nowTime, phoneToday, savedMessages } from "@/lib/logs";
import { addToOutbox } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

type Fields = Record<string, unknown> & { kind: LogKind };

/** Quick log: one kind at a time. Saves on the phone first, then syncs (src/lib/outbox.ts). */
export default function Log() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: LogKind = isLogKind(params.kind) ? params.kind : "mood";
  const { session } = useSession();
  const { current } = useCurrentChild();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.status !== "signed-in" || !current) return null;
  const child = current.child;
  const userId = session.me.user.id;

  async function save(fields: Fields) {
    setError(null);
    const item = { ...fields, id: Crypto.randomUUID(), childId: child.id, date: phoneToday(), time: nowTime() };
    const problem = await addToOutbox(userId, "logs", item);
    if (problem) return setError(problem);
    setSaved(true);
  }

  return (
    <Screen header>
      <Stack.Screen options={{ title: logKindLabels[kind] }} />
      {!canLog(current.role) ? (
        <Card>
          <Body>You can see {child.firstName}’s records, but logging is for family members who can log. An admin can change that.</Body>
        </Card>
      ) : saved ? (
        <Card>
          <Title>{kind === "win" ? "★" : "✓"}</Title>
          <Body>{savedMessages[kind]}</Body>
          <Body muted>It’s on this phone now and will sync with Lanternway.</Body>
          <Button label="Back to Today" onPress={() => router.back()} />
        </Card>
      ) : (
        <Card>
          {kind === "mood" && <MoodForm childName={child.firstName} onSave={save} />}
          {kind === "sleep" && <SleepForm onSave={save} />}
          {kind === "appetite" && <AppetiteForm onSave={save} />}
          {kind === "meltdown" && <MeltdownForm triggers={child.triggers ?? []} calmingStrategies={child.calmingStrategies ?? []} onSave={save} />}
          {(kind === "win" || kind === "note") && <TextForm kind={kind} childName={child.firstName} onSave={save} />}
          <Notice text={error} />
        </Card>
      )}
    </Screen>
  );
}

type OnSave = (fields: Fields) => Promise<void>;

function OptionalNote({ value, onChange, placeholder = "Anything else? (optional)" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Field label="Note (optional)" value={value} onChangeText={onChange} placeholder={placeholder} multiline style={{ minHeight: 88, paddingTop: 12 }} />;
}

function SaveButton({ disabled, onPress }: { disabled?: boolean; onPress: () => void }) {
  return <Button label="Save" onPress={disabled ? () => undefined : onPress} kind={disabled ? "secondary" : "primary"} />;
}

function MoodForm({ childName, onSave }: { childName: string; onSave: OnSave }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  return (
    <View style={{ gap: 16 }}>
      <RatingPicker label={`How was ${childName}’s mood today?`} labels={moodLabels} value={rating} onChange={setRating} />
      <OptionalNote value={note} onChange={setNote} />
      <SaveButton disabled={!rating} onPress={() => rating && onSave({ kind: "mood", rating, note: note.trim() || undefined })} />
    </View>
  );
}

const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function SleepForm({ onSave }: { onSave: OnSave }) {
  const [hours, setHours] = useState(9);
  const [bedtime, setBedtime] = useState("21:30");
  const [wakeTime, setWakeTime] = useState("06:45");
  const [nightWakings, setNightWakings] = useState(0);
  const [quality, setQuality] = useState<Rating | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Bedtime" value={bedtime} onChangeText={setBedtime} keyboardType="numbers-and-punctuation" placeholder="21:30" maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Woke up" value={wakeTime} onChangeText={setWakeTime} keyboardType="numbers-and-punctuation" placeholder="06:45" maxLength={5} />
        </View>
      </View>
      <Text style={[styles.small, { color: colors.muted }]}>Times as hours:minutes, for example 21:30.</Text>
      <Stepper label="Hours asleep" value={hours} step={0.5} min={0} max={14} unit="hrs" onChange={setHours} />
      <Stepper label="Wake-ups" value={nightWakings} step={1} min={0} max={10} onChange={setNightWakings} />
      <RatingPicker label="How restful was it? (optional)" labels={sleepQualityLabels} value={quality} onChange={setQuality} />
      <Notice text={problem} />
      <SaveButton
        onPress={() => {
          if (!isTime(bedtime) || !isTime(wakeTime)) return setProblem("Please write the times as hours:minutes, like 21:30.");
          setProblem(null);
          void onSave({ kind: "sleep", hours, bedtime, wakeTime, nightWakings, quality: quality ?? 3 });
        }}
      />
    </View>
  );
}

function AppetiteForm({ onSave }: { onSave: OnSave }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  return (
    <View style={{ gap: 16 }}>
      <RatingPicker label="How much did they eat today?" labels={appetiteLabels} value={rating} onChange={setRating} />
      <OptionalNote value={note} onChange={setNote} placeholder="e.g. small lunch, big snack after school" />
      <SaveButton disabled={!rating} onPress={() => rating && onSave({ kind: "appetite", rating, note: note.trim() || undefined })} />
    </View>
  );
}

// Shown after the child's own triggers from their profile (same list as the website).
const commonTriggers = ["Ending screen time", "Tired", "Hungry", "Hard homework", "Waiting"];
const durations = [5, 10, 15, 30, 45, 60];

function MeltdownForm({ triggers, calmingStrategies, onSave }: { triggers: string[]; calmingStrategies: string[]; onSave: OnSave }) {
  const [trigger, setTrigger] = useState<string | null>(null);
  const [otherTrigger, setOtherTrigger] = useState("");
  const [intensity, setIntensity] = useState<Rating | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [helped, setHelped] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const triggerOptions = [...new Set([...triggers, ...commonTriggers])];
  const finalTrigger = otherTrigger.trim() || trigger;
  const ready = !!intensity && !!duration;
  return (
    <View style={{ gap: 16 }}>
      <Body center={false}>Hard moments happen. Just jot down what you can — every detail is optional except how big and how long.</Body>
      <Chips label="What seemed to set it off?" options={triggerOptions} selected={trigger ? [trigger] : []} onToggle={(o) => setTrigger(trigger === o ? null : o)} />
      <Field label="Something else (optional)" value={otherTrigger} onChangeText={setOtherTrigger} placeholder="Something else…" />
      <RatingPicker label="How big was it?" labels={intensityLabels} value={intensity} onChange={setIntensity} />
      <Chips
        label="How long did it last?"
        options={durations.map((d) => (d === 60 ? "60+ min" : `${d} min`))}
        selected={duration ? [duration === 60 ? "60+ min" : `${duration} min`] : []}
        onToggle={(o) => setDuration(parseInt(o, 10))}
      />
      <Chips
        label="What helped?"
        options={calmingStrategies}
        selected={helped}
        onToggle={(o) => setHelped(helped.includes(o) ? helped.filter((h) => h !== o) : [...helped, o])}
      />
      <OptionalNote value={note} onChange={setNote} />
      <SaveButton
        disabled={!ready}
        onPress={() =>
          ready &&
          onSave({ kind: "meltdown", trigger: finalTrigger ?? "Not sure", intensity, durationMinutes: duration, whatHelped: helped, note: note.trim() || undefined })
        }
      />
    </View>
  );
}

function TextForm({ kind, childName, onSave }: { kind: "win" | "note"; childName: string; onSave: OnSave }) {
  const [text, setText] = useState("");
  const isWin = kind === "win";
  return (
    <View style={{ gap: 16 }}>
      <Field
        label={isWin ? `What went well for ${childName}?` : "What would you like to remember?"}
        value={text}
        onChangeText={setText}
        placeholder={isWin ? "Big or small — tried a new food, asked for help, a calm morning…" : "Anything worth noting today"}
        multiline
        style={{ minHeight: 120, paddingTop: 12 }}
      />
      <SaveButton disabled={!text.trim()} onPress={() => text.trim() && onSave({ kind, text: text.trim() })} />
    </View>
  );
}
