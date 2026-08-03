"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme: "light";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";

export function Turnstile({
  onTokenChange,
}: {
  onTokenChange: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [status, setStatus] = useState("Loading security check…");

  useEffect(() => {
    if (!siteKey) {
      onTokenChange(null);
      return;
    }

    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => {
          setStatus("Security check complete.");
          onTokenChange(token);
        },
        "expired-callback": () => {
          setStatus("Security check expired. Complete it again.");
          onTokenChange(null);
        },
        "error-callback": () => {
          setStatus("Security check failed to load. Refresh and try again.");
          onTokenChange(null);
        },
      });
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    render();

    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [onTokenChange, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="grid gap-2">
      <div ref={containerRef} />
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
