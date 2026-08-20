"use client";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Borderless option rows: a quiet hover highlight, no press-scale (the radio
// dot carries the state — grey ring off, green fill with its darker ring on).
const optionStyle =
  "group w-full justify-start gap-2.5 px-2.5 hover:bg-secondary [--press-scale:1]";
const radioDotStyle =
  "size-5 shrink-0 rounded-full border-2 border-foreground/25 transition-colors duration-150 ease-brand group-data-[state=on]:border-btn-border group-data-[state=on]:bg-primary";

/** The pill that opens the free-text answer; always rendered last. */
const OTHER = "Other";

/**
 * One optional multiple-choice question rendered as a stack of pills (one per
 * line), closed by an "Other" pill that reveals a free-text input when
 * selected.
 */
export function SurveyQuestion({
  label,
  hideLabel = false,
  options,
  value,
  otherValue,
  onChange,
  multiple = false,
  disabled = false,
}: {
  label: string;
  /** Keep the label for assistive tech only (when a card title carries it). */
  hideLabel?: boolean;
  options: readonly string[];
  /** Selected options; a single-choice question holds at most one entry. */
  value: string[];
  /** The free-text answer; undefined means "Other" is not selected. */
  otherValue?: string;
  onChange: (value: string[], otherValue?: string) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const otherSelected = otherValue !== undefined;
  const pills = [...options, OTHER].map((option) => (
    <ToggleGroupItem key={option} value={option} className={optionStyle}>
      <span className={radioDotStyle} aria-hidden="true" />
      {option}
    </ToggleGroupItem>
  ));
  const groupClassName = "w-full flex-col items-start";

  return (
    <FieldSet className="gap-0">
      <FieldLegend variant="label" className={hideLabel ? "sr-only" : undefined}>
        {label}
      </FieldLegend>
      {multiple ? (
        <ToggleGroup
          type="multiple"
          size="lg"
          spacing={2}
          className={groupClassName}
          value={otherSelected ? [...value, OTHER] : value}
          onValueChange={(next) =>
            onChange(
              next.filter((option) => option !== OTHER),
              next.includes(OTHER) ? (otherValue ?? "") : undefined
            )
          }
          disabled={disabled}
        >
          {pills}
        </ToggleGroup>
      ) : (
        <ToggleGroup
          type="single"
          size="lg"
          spacing={2}
          className={groupClassName}
          value={otherSelected ? OTHER : (value[0] ?? "")}
          onValueChange={(next) => {
            if (next === OTHER) onChange([], otherValue ?? "");
            else onChange(next ? [next] : [], undefined);
          }}
          disabled={disabled}
        >
          {pills}
        </ToggleGroup>
      )}
      {otherSelected && (
        <Input
          className="mt-3"
          value={otherValue}
          onChange={(event) => onChange(value, event.target.value)}
          placeholder="Tell us in your own words"
          aria-label={`${label} — your own answer`}
          autoFocus
          disabled={disabled}
        />
      )}
    </FieldSet>
  );
}
