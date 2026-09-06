import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { DiscussSplash } from "@/components/DiscussSplash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discuss — Animated Splash Screen" },
      {
        name: "description",
        content:
          "Premium animated splash screen for the Discuss app: the <Discuss/> wordmark builds character-by-character with a springy pop, in light and dark mode.",
      },
      { property: "og:title", content: "Discuss — Animated Splash Screen" },
      {
        property: "og:description",
        content:
          "Premium animated splash screen for the Discuss app: the <Discuss/> wordmark builds character-by-character with a springy pop, in light and dark mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [phase, setPhase] = useState<"splash" | "home">("splash");
  const [runKey, setRunKey] = useState(0);

  const handleFinish = useCallback(() => setPhase("home"), []);
  const replay = useCallback(() => {
    setRunKey((k) => k + 1);
    setPhase("splash");
  }, []);

  if (phase === "splash") {
    return <DiscussSplash onFinish={handleFinish} runKey={runKey} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <p
        className="text-3xl text-foreground"
        style={{ fontFamily: "var(--font-splash-script), cursive" }}
      >
        <span className="splash-bracket-red-static">{"<"}</span>
        Discuss
        <span className="splash-bracket-blue-static">{"/>"}</span>
      </p>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Splash complete — your app's home or sign-in screen continues here.
        </p>
        <button
          onClick={replay}
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground underline"
        >
          Replay the splash animation
        </button>
      </div>
    </div>
  );
}
