"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A dialog with one small form. `onSave` returns an error message to show,
 * or nothing to close the dialog. Used for every add / edit form in the app.
 */
export function FormDialog({
  trigger,
  title,
  description,
  saveLabel = "Save",
  onSave,
  children,
  destructive,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  saveLabel?: string;
  onSave: (form: FormData) => string | void;
  children: React.ReactNode;
  /** Optional extra action at the bottom-left, e.g. delete. Receives a close callback. */
  destructive?: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          noValidate
          aria-describedby={error ? errorId : undefined}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const problem = onSave(new FormData(e.currentTarget));
            if (problem) setError(problem);
            else setOpen(false);
          }}
        >
          {children}
          {error && (
            <p id={errorId} role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold text-teal">
              {error}
            </p>
          )}
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <div>{destructive?.(() => setOpen(false))}</div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full px-5">
                {saveLabel}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

/** Labeled text, number, or date input. */
export function Field({
  name,
  label,
  hint,
  required,
  className,
  ...input
}: FieldProps & Omit<React.ComponentProps<"input">, "name">) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="font-bold">
        {label}
        {!required && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      <Input id={id} name={name} required={required} aria-describedby={hint ? `${id}-hint` : undefined} className="h-11 bg-white" {...input} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  required,
  className,
  ...props
}: FieldProps & Omit<React.ComponentProps<"textarea">, "name">) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="font-bold">
        {label}
        {!required && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      <Textarea id={id} name={name} rows={2} aria-describedby={hint ? `${id}-hint` : undefined} className="bg-white" {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Native select: accessible and comfortable on phones. */
export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  options,
  ...props
}: FieldProps & { options: { value: string; label: string }[] } & Omit<React.ComponentProps<"select">, "name">) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="font-bold">
        {label}
        {!required && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      <select
        id={id}
        name={name}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-11 w-full rounded-lg border border-input bg-white px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Read a trimmed text value from a form. */
export const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
