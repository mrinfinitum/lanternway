import Image from "next/image";
import { brandImages } from "@/lib/brand";

export type OnePagerData = {
  firstName: string;
  age: number;
  pronouns?: string;
  aboutMe: string;
  communication: string;
  hard: string[];
  helps: string[];
  sensory: string[];
  likes: string[];
  diagnoses: string[];
  medications: string[];
  contacts: string[];
};

export type OnePagerOptions = { diagnoses: boolean; medications: boolean; contacts: boolean };

/** The shareable one-page summary (what a teacher, sitter, or camp would see). */
export function OnePager({ data, options }: { data: OnePagerData; options: OnePagerOptions }) {
  const { logoLockup } = brandImages;
  const list = (title: string, items: string[]) => (
    <section>
      <h3 className="text-sm font-extrabold">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );

  return (
    <article className="rounded-2xl border bg-white/60 p-5 text-teal">
      <header className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">All about me</p>
          <h2 className="text-2xl font-extrabold">{data.firstName}</h2>
          <p className="text-sm text-muted-foreground">
            Age {data.age}
            {data.pronouns && ` · ${data.pronouns}`}
          </p>
        </div>
        <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-24" />
      </header>
      <p className="mt-3 text-sm">{data.aboutMe}</p>
      <section className="mt-3 rounded-xl bg-amber/20 p-3">
        <h3 className="text-sm font-extrabold">How I communicate</h3>
        <p className="mt-1 text-sm">{data.communication}</p>
      </section>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {list("Things that are hard for me", data.hard)}
        {list("What helps me", data.helps)}
        {list("Sensory needs", data.sensory)}
        {list("Things I love", data.likes)}
        {options.diagnoses && list("Diagnoses", data.diagnoses)}
        {options.medications && list("Medications", data.medications)}
      </div>
      {options.contacts && <div className="mt-3">{list("If you need to reach my family", data.contacts)}</div>}
    </article>
  );
}
