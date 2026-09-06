import { useEffect, useState } from "react";

type Char = { ch: string; kind: "bracket-red" | "script" | "bracket-blue" };

const CHARS: Char[] = [
  { ch: "<", kind: "bracket-red" },
  { ch: "D", kind: "script" },
  { ch: "i", kind: "script" },
  { ch: "s", kind: "script" },
  { ch: "c", kind: "script" },
  { ch: "u", kind: "script" },
  { ch: "s", kind: "script" },
  { ch: "s", kind: "script" },
  { ch: "/", kind: "bracket-blue" },
  { ch: ">", kind: "bracket-blue" },
];

const STAGGER = 95;
const POP_MS = 520;
const HOLD_MS = 600;
const OUT_MS = 450;

export const SPLASH_TOTAL_MS =
  (CHARS.length - 1) * STAGGER + POP_MS + HOLD_MS + OUT_MS;

export function DiscussSplash({
  onFinish,
  runKey = 0,
}: {
  onFinish?: () => void;
  runKey?: number;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setLeaving(false);
    const outAt = (CHARS.length - 1) * STAGGER + POP_MS + HOLD_MS;
    const t1 = window.setTimeout(() => setLeaving(true), outAt);
    const t2 = window.setTimeout(() => onFinish?.(), outAt + OUT_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [runKey, onFinish]);

  return (
    <div
      className={`splash-root ${leaving ? "splash-leaving" : ""}`}
      aria-label="Discuss"
      role="img"
    >
      <div className="splash-wordmark">
        {CHARS.map((c, i) => (
          <span
            key={`${c.ch}-${i}`}
            className={`splash-char splash-${c.kind}`}
            style={{ animationDelay: `${i * STAGGER}ms` }}
          >
            {c.ch}
          </span>
        ))}
      </div>
    </div>
  );
}
