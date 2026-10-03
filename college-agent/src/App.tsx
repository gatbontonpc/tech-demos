import { useEffect, useState } from "react";
import { Shell } from "./components/Shell";
import { Connect } from "./screens/Connect";
import { Dossier } from "./screens/Dossier";
import { Memo } from "./screens/Memo";
import { Portfolio } from "./screens/Portfolio";
import { Questions } from "./screens/Questions";
import { Roster } from "./screens/Roster";

function currentScreen(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const screen = raw.split("?")[0] || "connect";
  if (["connect", "dossier", "questions", "portfolio", "memo", "roster"].includes(screen)) return screen;
  return "connect";
}

export function App() {
  const [screen, setScreen] = useState(currentScreen);

  useEffect(() => {
    const onHash = () => setScreen(currentScreen());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.location.hash = "#/connect";
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      connect: "Connect sources",
      dossier: "Day-one dossier",
      questions: "Three questions",
      portfolio: "Portfolio",
      memo: "Sunday memo",
      roster: "Counselor roster",
    };
    document.title = `Waypoint · ${titles[screen] ?? "Admissions agent"}`;
  }, [screen]);

  return (
    <Shell screen={screen}>
      {screen === "connect" && <Connect />}
      {screen === "dossier" && <Dossier />}
      {screen === "questions" && <Questions />}
      {screen === "portfolio" && <Portfolio />}
      {screen === "memo" && <Memo />}
      {screen === "roster" && <Roster />}
    </Shell>
  );
}
