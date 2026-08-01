"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, SpeakerHigh } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatAudioTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * "Play summary" pill (mock 2): wraps the generated mp3 in an outline pill
 * that shows progress + remaining time while playing.
 */
export function AudioPill({ src, className }: { src: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    const onError = () => {
      setFailed(true);
      setPlaying(false);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(
        () => setPlaying(true),
        () => setFailed(true)
      );
    }
  }

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        Audio is not available for this summary.
      </p>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggle}
        aria-label={playing ? "Pause summary audio" : "Play summary audio"}
      >
        {playing ? <Pause /> : <SpeakerHigh />}
        {playing ? "Pause" : "Play summary"}
      </Button>
      {duration > 0 && (
        <div className="flex items-center gap-2" aria-hidden="true">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, (progress / duration) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatAudioTime(progress)} / {formatAudioTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
