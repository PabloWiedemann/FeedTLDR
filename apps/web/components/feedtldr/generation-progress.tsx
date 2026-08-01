"use client";

import { Check, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "data_collection", label: "Collecting posts" },
  { id: "summarization", label: "Summarizing" },
  { id: "audio_generation", label: "Generating audio" },
  { id: "sending_email", label: "Sending email" },
] as const;

/**
 * Stage list driven by the pipeline_status document (polled every ~6s, same
 * seam the legacy progress dialog used).
 */
export function GenerationProgress({
  currentStage,
  stagesCompleted,
  error,
}: {
  currentStage: string;
  stagesCompleted: string[];
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {STAGES.map((stage) => {
          const done = stagesCompleted.includes(stage.id);
          const active = currentStage === stage.id && !done;
          return (
            <li
              key={stage.id}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors duration-300",
                done
                  ? "text-foreground"
                  : active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full border transition-colors duration-300",
                  done
                    ? "border-transparent bg-pastel-green text-pastel-green-foreground"
                    : active
                      ? "border-foreground/30"
                      : "border-border"
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <CircleNotch className="size-3.5 animate-spin" />
                ) : null}
              </span>
              {stage.label}
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted-foreground">
        This can take a few minutes. You can close this page, we&rsquo;ll email
        you when it&rsquo;s done.
      </p>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
