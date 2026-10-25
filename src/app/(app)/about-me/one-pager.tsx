import Image from "next/image";
import { brandImages } from "@/lib/brand";
import type { SharedProfile, SharedSection } from "./share";

/**
 * The shareable one-page summary (what a teacher, sitter, or camp would see).
 * It renders whatever it's given; `buildSharedProfile` decides what that is.
 */
export function OnePager({ profile }: { profile: SharedProfile }) {
  const { logoLockup } = brandImages;
  const communication = profile.sections.find((s) => s.kind === "text");
  const contacts = profile.sections.find((s) => s.key === "contacts");
  const lists = profile.sections.filter((s) => s !== communication && s !== contacts);

  return (
    <article className="rounded-2xl border bg-white p-5 text-teal">
      <header className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">All about me</p>
          <h2 className="text-2xl font-extrabold">{profile.firstName}</h2>
          <p className="text-sm text-muted-foreground">
            Age {profile.age}
            {profile.pronouns && ` · ${profile.pronouns}`}
          </p>
        </div>
        <Image {...logoLockup} alt={logoLockup.alt} className="h-auto w-24" />
      </header>
      <p className="mt-3 text-sm">{profile.intro}</p>
      {communication?.kind === "text" && (
        <section className="mt-3 rounded-xl bg-amber/20 p-3">
          <h3 className="text-sm font-extrabold">{communication.title}</h3>
          <p className="mt-1 text-sm">{communication.text}</p>
        </section>
      )}
      {lists.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {lists.map((s) => (
            <List key={s.key} section={s} />
          ))}
        </div>
      )}
      {contacts && (
        <div className="mt-3">
          <List section={contacts} />
        </div>
      )}
    </article>
  );
}

function List({ section }: { section: SharedSection }) {
  if (section.kind !== "list") return null;
  return (
    <section>
      <h3 className="text-sm font-extrabold">{section.title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
        {section.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
}
