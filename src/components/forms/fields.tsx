"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Base<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  optional?: boolean;
  className?: string;
};

function LabelText({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <FormLabel>
      {label}
      {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
    </FormLabel>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  className,
  ...input
}: Base<T> & Omit<React.ComponentProps<"input">, "name" | "className">) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <Input className="h-10" {...input} {...field} value={field.value ?? ""} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Number input that stores `null` when empty and a number otherwise. */
export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  className,
  ...input
}: Base<T> & Omit<React.ComponentProps<"input">, "name" | "className" | "type">) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <Input
              className="h-10"
              type="number"
              inputMode="numeric"
              {...input}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  className,
  ...textarea
}: Base<T> & Omit<React.ComponentProps<"textarea">, "name" | "className">) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <Textarea rows={5} {...textarea} {...field} value={field.value ?? ""} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  optional,
  className,
  options,
  placeholder,
}: Base<T> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <NativeSelect {...field} value={field.value ?? ""}>
              {placeholder !== undefined && <option value="">{placeholder}</option>}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>({ control, name, label, description, className }: Base<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <FormLabel>{label}</FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
            </div>
            <FormControl>
              <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** Textarea bound to a string[] — one item per line. */
function LinesTextarea({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(() => value.join("\n"));
  const [seen, setSeen] = useState(value);
  // Re-sync when the form value is replaced externally (e.g. reset or template applied).
  if (value !== seen) {
    setSeen(value);
    const current = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (current.join("\n") !== value.join("\n")) setText(value.join("\n"));
  }
  return (
    <Textarea
      {...props}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const next = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
        setSeen(next);
        onChange(next);
      }}
    />
  );
}

export function ListField<T extends FieldValues>({
  control,
  name,
  label,
  description = "One item per line.",
  optional,
  className,
  rows = 5,
  placeholder,
}: Base<T> & { rows?: number; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <LinesTextarea
              rows={rows}
              placeholder={placeholder}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          {/* Array fields report errors per item; surface the first one. */}
          {Array.isArray(fieldState.error) ? (
            <p className="text-sm text-destructive">{fieldState.error.find(Boolean)?.message}</p>
          ) : (
            <FormMessage />
          )}
        </FormItem>
      )}
    />
  );
}

function TagsInput({
  value,
  onChange,
  placeholder,
  id,
  max = 30,
  ...aria
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
  max?: number;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...value];
    for (const item of items) {
      if (next.length < max && !next.some((v) => v.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, 40));
    }
    onChange(next);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Input
        id={id}
        {...aria}
        className="h-10"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 py-1 pr-1 pl-2.5">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  onClick={() => onChange(value.filter((v) => v !== tag))}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TagsField<T extends FieldValues>({
  control,
  name,
  label,
  description = "Press Enter or comma to add.",
  optional,
  className,
  placeholder,
  max,
}: Base<T> & { placeholder?: string; max?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelText label={label} optional={optional} />
          <FormControl>
            <TagsInput value={(field.value as string[]) ?? []} onChange={field.onChange} placeholder={placeholder} max={max} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
