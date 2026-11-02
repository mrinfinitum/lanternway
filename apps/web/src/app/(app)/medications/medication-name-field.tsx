"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Suggestion = { generic: string; brands: string[]; drugClass: string; forms: string[]; matchedBrand?: string };

/** Every form a medication might come in. A picked medication narrows this list. */
export const ALL_FORMS = [
  "Tablet",
  "Extended-release tablet",
  "Delayed-release tablet",
  "Capsule",
  "Extended-release capsule",
  "Sprinkle capsule",
  "Chewable",
  "Dissolving tablet",
  "Liquid",
  "Gummy",
  "Powder",
  "Granules",
  "Patch",
  "Inhaler",
  "Nebulizer solution",
  "Nasal spray",
  "Rectal gel",
  "Auto-injector",
  "Film",
  "Packet for liquid",
  "Other",
];

/**
 * Medication name with suggestions from the catalog (generic and brand names).
 * Typing anything is still fine; suggestions only save typing. WAI-ARIA combobox pattern.
 */
export function MedicationNameAndForm({ defaultName = "", defaultForm = "" }: { defaultName?: string; defaultForm?: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const [name, setName] = useState(defaultName);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [form, setForm] = useState(defaultForm || "Tablet");
  const skipNextSearch = useRef(false);

  // Search as they type (debounced; cancels stale requests).
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = name.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { results: Suggestion[] };
        setResults(data.results);
        setOpen(data.results.length > 0);
        setActive(-1);
      } catch {
        /* aborted or offline: typing still works */
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  const label = (s: Suggestion) => (s.matchedBrand ? `${s.matchedBrand} (${s.generic.toLowerCase()})` : s.generic);

  const choose = (s: Suggestion) => {
    skipNextSearch.current = true;
    setName(label(s));
    setPicked(s);
    setOpen(false);
    setResults([]);
    if (!s.forms.includes(form)) setForm(s.forms[0] ?? "Other");
  };

  const formOptions = picked ? [...picked.forms, "Other"] : ALL_FORMS;
  const showList = open && name.trim().length >= 2 && results.length > 0;

  return (
    <>
      <div className="relative space-y-1.5">
        <Label htmlFor={id} className="font-bold">
          Medication name
        </Label>
        <Input
          id={id}
          name="name"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          required
          placeholder="Start typing, e.g. Concerta"
          className="h-11 bg-white"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPicked(null);
            if (e.target.value.trim().length < 2) {
              setOpen(false);
              setResults([]);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault(); // pick the suggestion instead of submitting the form
              choose(results[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {picked ? `${picked.drugClass} · also called ${[picked.generic, ...picked.brands].filter((n) => !name.startsWith(n)).slice(0, 3).join(", ") || "—"}` : "Pick a suggestion or type it as it's written on the label."}
        </p>
        <p className="sr-only" aria-live="polite">
          {showList ? `${results.length} ${results.length === 1 ? "suggestion" : "suggestions"}. Use up and down arrows to choose.` : ""}
        </p>
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Medication suggestions"
            className="absolute inset-x-0 top-[4.6rem] z-50 max-h-72 overflow-y-auto rounded-2xl bg-popover p-1.5 shadow-lg ring-1 ring-border"
          >
            {results.map((s, i) => (
              <li
                key={`${s.generic}-${s.matchedBrand ?? ""}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // Keep focus in the input while choosing with the mouse.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                className={cn("cursor-pointer rounded-xl px-3 py-2", i === active ? "bg-cream" : "hover:bg-cream/60")}
              >
                <span className="block font-bold">{label(s)}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.drugClass}
                  {!s.matchedBrand && s.brands.length > 0 && ` · ${s.brands.slice(0, 3).join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-form`} className="font-bold">
          Form <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <select
          id={`${id}-form`}
          name="form"
          value={formOptions.includes(form) ? form : "Other"}
          onChange={(e) => setForm(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-white px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {[...new Set([...formOptions, ...(defaultForm && !formOptions.includes(defaultForm) ? [defaultForm] : [])])].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
