"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  FlaskConical,
  Orbit,
  Wrench,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Trophy,
  Star,
  Check,
  Lock,
  LogOut,
  Lightbulb,
  ChevronRight,
  Volume2,
  VolumeX,
  Move,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GameBoard, type BoardHandle } from "./game-board";
import {
  LEVELS,
  PARTS,
  costOf,
  type Placement,
  type PartKind,
  type Level,
} from "@/lib/game/levels";
import { validateBuild, type RunResult } from "@/lib/game/physics";
import { makerProfile, type WeeklyBoard } from "@/lib/game/progression";
import type { Student, Progress, Ranking } from "@/lib/server/store";
type ApiResponse = {
  error?: string;
  student: Student | null;
  students: Student[];
  progress: Progress[];
  demo: boolean;
  result: RunResult;
  records: Ranking[];
  weekly: WeeklyBoard;
};
async function api(path: string, options?: RequestInit): Promise<ApiResponse> {
  const r = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = (await r.json()) as ApiResponse;
  if (!r.ok) throw new Error(data.error || "Please try again.");
  return data;
}
function Stars({ count = 0 }: { count?: number }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={19}
          fill={n <= count ? "currentColor" : "none"}
          className={n > count ? "empty-star" : ""}
        />
      ))}
    </span>
  );
}
function PartIcon({ kind }: { kind: PartKind }) {
  if (kind === "wheel")
    return (
      <svg viewBox="0 0 100 56" aria-hidden="true" className="part-icon">
        <circle cx="50" cy="28" r="23" fill={PARTS[kind].color} />
        <path d="M27 28h46M50 5v46" stroke="#315b70" strokeWidth="4" />
        <circle cx="50" cy="28" r="6" fill="#315b70" />
      </svg>
    );
  return (
    <svg viewBox="0 0 100 56" aria-hidden="true" className="part-icon">
      {kind === "spring" ? (
        <>
          <path
            d="M22 43l10-12 10 12 10-12 10 12 10-12 8 12"
            fill="none"
            stroke="#5f8f40"
            strokeWidth="4"
          />
          <rect
            x="17"
            y="17"
            width="66"
            height="13"
            rx="5"
            fill={PARTS[kind].color}
          />
          <path
            d="M50 15V2m-7 7 7-7 7 7"
            fill="none"
            stroke="#b2ed7c"
            strokeWidth="3"
          />
        </>
      ) : (
        <g transform={kind === "ramp" ? "rotate(15 50 28)" : ""}>
          <rect
            x="5"
            y="20"
            width="90"
            height="16"
            rx="4"
            fill={PARTS[kind].color}
          />
          <circle cx="13" cy="28" r="2" fill="#5b6c78" />
          <circle cx="87" cy="28" r="2" fill="#5b6c78" />
        </g>
      )}
    </svg>
  );
}
function LevelDiagram({ level }: { level: Level }) {
  if (level.id > 3)
    return (
      <svg
        viewBox="0 0 960 540"
        className="level-diagram"
        role="img"
        aria-label={level.verb}
      >
        {level.platforms.map((p, i) => (
          <rect
            key={i}
            x={p.x - p.width / 2}
            y={p.y - p.height / 2}
            width={p.width}
            height={p.height}
            fill="#7797b1"
            transform={`rotate(${p.angle || 0} ${p.x} ${p.y})`}
          />
        ))}
        {level.solution.map((p) => (
          <rect
            key={p.id}
            x={p.x - PARTS[p.kind].width / 2}
            y={p.y - 9}
            width={PARTS[p.kind].width}
            height="18"
            rx="7"
            fill={PARTS[p.kind].color}
            opacity=".8"
            transform={`rotate(${p.angle} ${p.x} ${p.y})`}
          />
        ))}
        {[level.goal, ...(level.second ? [level.second.goal] : [])].map(
          (g, i) => (
            <path
              key={i}
              d={`M${g.x - g.width / 2} ${g.y}v45h${g.width}v-45`}
              stroke={i ? "#5daee6" : "#b2ed7c"}
              fill="none"
              strokeWidth="14"
            />
          ),
        )}
        {level.cargo === "box" ? (
          <rect
            x={level.spawn.x - 22}
            y={level.spawn.y - 22}
            width="44"
            height="44"
            fill="#f08b50"
          />
        ) : (
          <ellipse
            cx={level.spawn.x}
            cy={level.spawn.y}
            rx="22"
            ry={level.cargo === "egg" ? 30 : 22}
            fill={level.cargo === "egg" ? "#fff5d6" : "#f08b50"}
          />
        )}
        {level.second && (
          <circle
            cx={level.second.spawn.x}
            cy={level.second.spawn.y}
            r="22"
            fill="#5daee6"
          />
        )}
      </svg>
    );
  return (
    <svg
      viewBox="0 0 320 160"
      className="level-diagram"
      role="img"
      aria-label={level.verb}
    >
      <defs>
        <pattern
          id={`grid-${level.id}`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1" fill="#536779" />
        </pattern>
      </defs>
      <rect width="320" height="160" fill={`url(#grid-${level.id})`} />
      <circle cx="45" cy="38" r="12" fill="#f08b50" />
      {level.id === 1 ? (
        <>
          <path
            d="M45 66l135 42"
            stroke="#f2b46d"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M192 105q26 8 40 28"
            fill="none"
            stroke="#a7bacc"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        </>
      ) : level.id === 2 ? (
        <>
          <path d="M18 70l78 20M220 129h72" stroke="#7797b1" strokeWidth="12" />
          <path
            d="M112 94l92 23"
            stroke="#94c9ef"
            strokeWidth="4"
            strokeDasharray="6 6"
          />
        </>
      ) : (
        <>
          <path
            d="M45 67l72 32"
            stroke="#f2b46d"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M120 126l10-12 10 12 10-12 10 12"
            stroke="#b2ed7c"
            strokeWidth="4"
            fill="none"
          />
          <path
            d="M149 103q48-107 101-39"
            fill="none"
            stroke="#b8a3d8"
            strokeWidth="3"
            strokeDasharray="5 5"
          />
        </>
      )}
      <path
        d={level.id === 3 ? "M228 72v28h52V72" : "M228 116v28h52v-28"}
        fill="#87b79a22"
        stroke="#b2ed7c"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export default function Inventra() {
  const [student, setStudent] = useState<Student | null>(null),
    [progress, setProgress] = useState<Progress[]>([]),
    [demo, setDemo] = useState(true),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [matches, setMatches] = useState<Student[]>([]),
    [chosen, setChosen] = useState<Student | null>(null),
    [searching, setSearching] = useState(false);
  const [screen, setScreen] = useState<"hub" | "play">("hub"),
    [levelId, setLevelId] = useState(1),
    [parts, setParts] = useState<Placement[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState<PartKind | null>(null),
    [mode, setMode] = useState<"build" | "running" | "paused" | "finished">(
      "build",
    ),
    [runKey, setRunKey] = useState(0),
    [hint, setHint] = useState(false),
    [seconds, setSeconds] = useState(0),
    [result, setResult] = useState<RunResult | null>(null),
    [resultOpen, setResultOpen] = useState(false),
    [saveState, setSaveState] = useState<"saving" | "saved" | "failed">(
      "saved",
    ),
    [newBest, setNewBest] = useState(false),
    [muted, setMuted] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false),
    [rankLevel, setRankLevel] = useState(1),
    [rankings, setRankings] = useState<Ranking[]>([]),
    [rankLoading, setRankLoading] = useState(false),
    [rankError, setRankError] = useState("");
  const board = useRef<BoardHandle>(null),
    draggedPalette = useRef(false),
    attempt = useRef(""),
    snapshot = useRef<Placement[]>([]),
    audio = useRef<AudioContext | null>(null),
    rankingRequest = useRef(0);
  const level = LEVELS[levelId - 1],
    selectedPart = parts.find((p) => p.id === selected),
    best = progress.find((p) => p.level_id === levelId),
    stars = progress.reduce((a, p) => a + p.stars, 0);
  const maker = makerProfile(progress);
  const [weekly, setWeekly] = useState<WeeklyBoard | null>(null);
  const [weeklyError, setWeeklyError] = useState("");
  useEffect(() => {
    if (!student || screen !== "hub") return;
    let active = true;
    api("/api/weekly")
      .then((d) => {
        if (active) {
          setWeekly(d.weekly);
          setWeeklyError("");
        }
      })
      .catch(() => {
        if (active)
          setWeeklyError(
            "Weekly board unavailable. Your challenges still work.",
          );
      });
    return () => {
      active = false;
    };
  }, [student, screen]);
  const initialise = useCallback(() => {
    api("/api/session")
      .then((d) => {
        setError("");
        setStudent(d.student);
        setProgress(d.progress);
        setDemo(d.demo);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(initialise, [initialise]);
  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      api(`/api/students?q=${encodeURIComponent(query.trim())}`)
        .then((d) => {
          if (!stale) {
            setMatches(d.students);
            setError("");
          }
        })
        .catch((e) => {
          if (!stale) setError(e.message);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, 220);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);
  async function login() {
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/session", {
        method: "POST",
        body: JSON.stringify({
          student_id: chosen.student_id,
          confirmed: true,
        }),
      });
      setStudent(d.student);
      setProgress(d.progress);
      setDemo(d.demo);
      setChosen(null);
      setQuery("");
      setScreen("hub");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/session", { method: "DELETE" });
      setStudent(null);
      setProgress([]);
      setScreen("hub");
      setChosen(null);
      setQuery("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openLevel(id: number) {
    if (id > 1 && !progress.some((p) => p.level_id === id - 1)) return;
    setLevelId(id);
    setParts([]);
    setMode("build");
    setRunKey((k) => k + 1);
    setResult(null);
    setResultOpen(false);
    setSelected(null);
    setTool(null);
    setHint(false);
    setSeconds(0);
    setError("");
    setScreen("play");
  }
  function edit() {
    setMode("build");
    setRunKey((k) => k + 1);
    setResultOpen(false);
    setResult(null);
    setSeconds(0);
    setError("");
  }
  function addPart(kind: PartKind, x = 460, y = 300) {
    if (mode !== "build") return;
    if (parts.length >= 8) {
      setError("Eight parts maximum. Try removing one.");
      return;
    }
    const count = parts.filter((p) => p.kind === kind).length;
    if (count >= (level.inventory[kind] || 0)) {
      setError(`All ${PARTS[kind].label.toLowerCase()}s are on the board.`);
      return;
    }
    const p = {
      id: crypto.randomUUID(),
      kind,
      x: Math.round(Math.max(35, Math.min(925, x))),
      y: Math.round(Math.max(160, Math.min(495, y))),
      angle: kind === "spring" ? 45 : 15,
    };
    if (costOf([...parts, p]) > level.budget) {
      setError("Try fewer parts to stay in budget.");
      return;
    }
    setParts([...parts, p]);
    setSelected(p.id);
    setTool(null);
    setError("");
  }
  function stagePart(kind: PartKind) {
    // Pick a visible, legal, unoccupied staging position. No second board tap.
    for (const y of [210, 270, 330, 390])
      for (const x of [460, 660, 260]) {
        if (
          parts.some((p) => Math.abs(p.x - x) < 100 && Math.abs(p.y - y) < 45)
        )
          continue;
        try {
          validateBuild(level, [
            ...parts,
            {
              id: "staging-check",
              kind,
              x,
              y,
              angle: kind === "spring" ? 45 : 15,
            },
          ]);
          addPart(kind, x, y);
          return;
        } catch {}
      }
    setError("Make a little room, or remove a part.");
  }
  function changeSelected(change: Partial<Placement>) {
    if (mode !== "build") return;
    setParts(parts.map((p) => (p.id === selected ? { ...p, ...change } : p)));
    setError("");
  }
  function rotate(delta: number) {
    if (selectedPart)
      changeSelected({
        angle: Math.max(-75, Math.min(75, selectedPart.angle + delta)),
      });
  }
  function sound(win: boolean) {
    if (muted) return;
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
      [0, 1, 2].forEach((n) => {
        const o = audio.current!.createOscillator(),
          g = audio.current!.createGain(),
          t = audio.current!.currentTime + n * 0.13;
        o.type = "sine";
        o.frequency.value = win ? [523, 659, 784][n] : [330, 294, 262][n];
        g.gain.setValueAtTime(0.045, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g).connect(audio.current!.destination);
        o.start(t);
        o.stop(t + 0.23);
      });
    } catch {}
  }
  function run() {
    setError("");
    if (mode === "paused") {
      setMode("running");
      return;
    }
    if (mode === "running") {
      setMode("paused");
      return;
    }
    try {
      const valid = validateBuild(level, parts);
      setParts(valid);
      snapshot.current = valid;
      attempt.current = crypto.randomUUID();
      setResult(null);
      setResultOpen(false);
      setSeconds(0);
      setMode("running");
      setRunKey((k) => k + 1);
      if (!muted) {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    setSaveState("saving");
    try {
      const d = await api("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          attempt_id: attempt.current,
          level_id: levelId,
          build: snapshot.current,
        }),
      });
      setNewBest(d.result.won && (!best || d.result.score > best.best_score));
      setResult(d.result);
      setProgress(d.progress);
      setSaveState("saved");
    } catch (e) {
      setSaveState("failed");
      setError((e as Error).message);
    }
  }
  function complete(r: RunResult) {
    setResult(r);
    setMode("finished");
    setResultOpen(true);
    sound(r.won);
    void save();
  }
  async function leaderboard(id = levelId) {
    const request = ++rankingRequest.current;
    setRankLevel(id);
    setBoardOpen(true);
    setRankLoading(true);
    setRankError("");
    try {
      const d = await api(`/api/leaderboard?level=${id}`);
      if (request === rankingRequest.current) setRankings(d.records);
    } catch (e) {
      if (request === rankingRequest.current)
        setRankError((e as Error).message);
    } finally {
      if (request === rankingRequest.current) setRankLoading(false);
    }
  }
  function paletteDown(e: React.PointerEvent, kind: PartKind) {
    if (mode !== "build") return;
    draggedPalette.current = false;
    const start = { x: e.clientX, y: e.clientY };
    const cleanup = () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cleanup);
    };
    const up = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
        draggedPalette.current = true;
        board.current?.drop(kind, event.clientX, event.clientY);
      }
      cleanup();
    };
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", cleanup, { once: true });
  }
  useEffect(() => {
    if (screen !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches("input,textarea,[role=combobox]") ||
        resultOpen ||
        boardOpen
      )
        return;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        rotate(e.shiftKey ? -5 : 5);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && mode === "build") {
        e.preventDefault();
        setParts((p) => p.filter((x) => x.id !== selected));
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      ctx.registerTool(
        {
          name: "inventra_read_progress",
          description: "Read the selected pupil's Motion Lab progress.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: unknown) => {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("No arguments expected");
            const d = await api("/api/session");
            return {
              signedIn: !!d.student,
              demo: d.demo,
              progress: d.progress.map((p: Progress) => ({
                level: p.level_id,
                score: p.best_score,
                stars: p.stars,
              })),
            };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <main
      className={`lab-shell ${screen === "play" && student ? "playing" : ""}`}
    >
      <header className="topbar">
        <Link
          className="wordmark"
          href="/"
          onClick={(e) => {
            if (student) {
              e.preventDefault();
              setScreen("hub");
              setMode("build");
              setRunKey((k) => k + 1);
            }
          }}
        >
          <Orbit /> INVENTRA<span className="edition">SK METHODIST PJ</span>
        </Link>
        <div className="header-actions">
          {demo && <span className="demo-tag">DEMO LAB</span>}
          {student ? (
            <>
              <button
                className="sound-button"
                aria-label={muted ? "Turn sound on" : "Mute sound"}
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button
                className="student-chip"
                disabled={busy || saveState === "saving"}
                onClick={logout}
                aria-label="Switch pupil"
              >
                <span className="avatar">{student.fullname[0]}</span>
                <span>
                  {student.fullname.split(" ")[0]}
                  <small>{student.class_name}</small>
                </span>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <span className="season-tag">SEASON 01</span>
          )}
        </div>
      </header>
      {!student ? (
        <section className="welcome">
          <div className="welcome-copy">
            <span className="eyebrow">
              <FlaskConical size={18} /> THE INVENTION STARTS HERE
            </span>
            <h1>
              Big ideas.
              <br />
              <em>Small inventors.</em>
            </h1>
            <p>Build. Test. Discover.</p>
            <div className="entry-panel">
              <label htmlFor="name">Find your name</label>
              <Combobox
                items={matches}
                filter={null}
                itemToStringLabel={(s: Student) => s.fullname}
                onInputValueChange={(v) => {
                  setQuery(v);
                  setSearching(v.trim().length >= 2);
                  if (v.trim().length < 2) setMatches([]);
                }}
                onValueChange={(s: Student | null) => setChosen(s)}
              >
                <ComboboxInput
                  id="name"
                  placeholder={
                    demo ? "Try Ada, Ben or Maya…" : "Type part of your name…"
                  }
                  showTrigger={false}
                  disabled={loading}
                  autoComplete="off"
                />
                <ComboboxContent className="name-popup">
                  <ComboboxEmpty>
                    {searching
                      ? "Finding names…"
                      : query.length < 2
                        ? "Type at least 2 letters"
                        : "No matches. Try another part of your name."}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(s: Student) => (
                      <ComboboxItem
                        key={s.student_id}
                        value={s}
                        className="name-option"
                      >
                        <span className="avatar">{s.fullname[0]}</span>
                        <span>
                          <b>{s.fullname}</b>
                          <small>{s.class_name}</small>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {loading ? (
                <p className="quiet">Opening your lab…</p>
              ) : (
                <p className="quiet">
                  {demo
                    ? "Demo pupils only. School roster not connected yet."
                    : "Type any part of your name, then choose your class."}
                </p>
              )}
              {error && (
                <div role="alert" className="error-message">
                  {error}
                  <button onClick={initialise}>Try again</button>
                </div>
              )}
            </div>
          </div>
          <div className="season-board">
            <div className="board-title">
              <span>YOUR FIRST ADVENTURE</span>
              <span>10 CHALLENGES</span>
            </div>
            <h2>
              Motion Lab<span>Make something move.</span>
            </h2>
            <div className="welcome-diagram">
              <LevelDiagram level={LEVELS[0]} />
            </div>
            <div className="mission-preview">
              <Wrench />
              <div>
                <b>Build it. Try it. Make it better.</b>
                <span>A ball. A few parts. Your big idea.</span>
              </div>
              <ArrowRight />
            </div>
          </div>
        </section>
      ) : screen === "hub" ? (
        <section className="hub">
          <div className="hub-heading">
            <div>
              <span className="eyebrow">SEASON 01 / YOUR WORKSHOP</span>
              <h1>
                Motion Lab<span className="title-dot">.</span>
              </h1>
              <p>Ten challenges. More than one way to win.</p>
            </div>
            <div className="maker-stat">
              <Star fill="currentColor" />
              <b>
                {stars}
                <span>/ 30</span>
              </b>
              <small>STARS COLLECTED</small>
            </div>
          </div>
          <div className="maker-strip" aria-label="Maker progress">
            <strong>Maker Level {maker.level}</strong>
            <span>{maker.xp} XP</span>
            <span>{maker.coins} Coins</span>
            {maker.badges.map((b) => (
              <span className="maker-badge" key={b}>
                <Trophy size={16} />
                {b}
              </span>
            ))}
          </div>
          <section className="weekly-panel" aria-label="Weekly challenge">
            <h2>
              <Trophy size={22} /> This week
            </h2>
            {weekly ? (
              <>
                <p>
                  {LEVELS[weekly.challenge.level - 1].name} · Ends{" "}
                  {new Date(weekly.challenge.ends).toLocaleDateString("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                  })}
                </p>
                <div className="weekly-columns">
                  {(["cost", "parts", "time"] as const).map((category) => (
                    <div key={category}>
                      <h3>
                        {
                          {
                            cost: "Lowest Cost",
                            parts: "Fewest Parts",
                            time: "Fastest Time",
                          }[category]
                        }
                      </h3>
                      <ol>
                        {weekly[category].slice(0, 3).map((r, i) => (
                          <li key={i}>
                            {r.is_you ? "You" : r.fullname}{" "}
                            <b>
                              {category === "cost" ? "RM" : ""}
                              {r.value}
                              {category === "time" ? "s" : ""}
                            </b>
                          </li>
                        ))}
                      </ol>
                      {!weekly[category].length && <p>Be the first!</p>}
                    </div>
                  ))}
                </div>
                <p>
                  Class contribution: each pupil adds 10 points once this week.
                </p>
                <div className="class-cup">
                  {weekly.classes.map((c) => (
                    <span key={c.class_name}>
                      {c.class_name}: <b>{c.points} points</b> ({c.contributors}{" "}
                      makers)
                    </span>
                  ))}
                </div>
                <button
                  className="secondary"
                  disabled={
                    weekly.challenge.level > 1 &&
                    !progress.some(
                      (p) => p.level_id === weekly.challenge.level - 1,
                    )
                  }
                  onClick={() => openLevel(weekly.challenge.level)}
                >
                  Try this week&apos;s challenge <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <p>{weeklyError || "Loading this week's challenge…"}</p>
            )}
          </section>
          <div className="mission-cards">
            {LEVELS.map((l) => {
              const p = progress.find((x) => x.level_id === l.id),
                locked =
                  l.id > 1 && !progress.some((x) => x.level_id === l.id - 1);
              return (
                <article
                  className={`mission-card ${locked ? "locked" : ""}`}
                  key={l.id}
                >
                  <div className="card-top">
                    <span>CHALLENGE 0{l.id}</span>
                    {p ? (
                      <Check size={20} />
                    ) : locked ? (
                      <Lock size={17} />
                    ) : (
                      <span className="ready-label">LET’S GO</span>
                    )}
                  </div>
                  <LevelDiagram level={l} />
                  <div className="card-body">
                    <h2>{l.name}</h2>
                    <p>{l.verb}.</p>
                    <Stars count={p?.stars} />
                    <button
                      className={locked ? "secondary full" : "primary full"}
                      disabled={locked}
                      onClick={() => openLevel(l.id)}
                    >
                      {locked ? (
                        <>
                          <Lock size={17} /> Finish challenge {l.id - 1}
                        </>
                      ) : (
                        <>
                          {p ? "Build again" : "Let’s build"}
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                    {p && (
                      <span className="best-caption">
                        BEST {p.best_score.toLocaleString()} · RM{p.cost}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hub-bottom">
            <div className="how-to">
              <span>
                <Wrench /> BUILD
              </span>
              <ChevronRight />
              <span>
                <Play /> TEST
              </span>
              <ChevronRight />
              <span>
                <Lightbulb /> DISCOVER
              </span>
            </div>
            <button className="text-button" onClick={() => leaderboard(1)}>
              <Trophy size={20} /> Best builds <ArrowRight size={18} />
            </button>
          </div>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="workshop">
          <div className="workshop-heading">
            <button
              className="back-button"
              aria-label="Back to challenges"
              disabled={saveState === "saving"}
              onClick={() => {
                setScreen("hub");
                setMode("build");
                setRunKey((k) => k + 1);
              }}
            >
              <ArrowLeft size={21} />
            </button>
            <div>
              <span className="eyebrow">CHALLENGE 0{level.id}</span>
              <h1>{level.name}</h1>
            </div>
            <div className="level-steps">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  aria-label={`Challenge ${l.id}`}
                  aria-current={l.id === levelId ? "step" : undefined}
                  disabled={
                    saveState === "saving" ||
                    (l.id > 1 && !progress.some((p) => p.level_id === l.id - 1))
                  }
                  onClick={() => openLevel(l.id)}
                >
                  {progress.some((p) => p.level_id === l.id) ? (
                    <Check size={17} />
                  ) : (
                    l.id
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="editor-layout">
            <div className="board-column">
              <div className="board-header">
                <span>
                  <span className="orange-ball" /> <ArrowRight size={17} />
                  <span className="goal-symbol" /> <b>{level.verb}</b>
                </span>
                <button
                  className={hint ? "hint active" : "hint"}
                  aria-pressed={hint}
                  onClick={() => setHint(!hint)}
                >
                  <Lightbulb size={18} /> Hint
                </button>
              </div>
              <div className="board-wrap">
                <GameBoard
                  ref={board}
                  level={level}
                  parts={parts}
                  selected={selected}
                  tool={tool}
                  mode={mode}
                  runKey={runKey}
                  hint={hint}
                  onParts={setParts}
                  onSelect={setSelected}
                  onDrop={addPart}
                  onComplete={complete}
                  onTime={setSeconds}
                />
                {mode === "paused" && (
                  <div className="paused-label">
                    <Pause size={20} /> PAUSED
                  </div>
                )}
              </div>
              <div className="simulation-bar">
                <div className="sim-info">
                  <span className={`mode-dot ${mode}`} />
                  <b>
                    {mode === "build"
                      ? "BUILD MODE"
                      : mode === "running"
                        ? "LET IT ROLL"
                        : mode === "paused"
                          ? "PAUSED"
                          : "TRY IT AGAIN"}
                  </b>
                  <span>{seconds.toFixed(1)} s</span>
                </div>
                <button
                  className="secondary"
                  onClick={edit}
                  disabled={mode === "build" || saveState === "saving"}
                >
                  <Undo2 size={18} />
                  <span>Edit build</span>
                </button>
                <button
                  className="primary run-button"
                  onClick={run}
                  disabled={saveState === "saving"}
                >
                  {mode === "running" ? (
                    <>
                      <Pause size={20} /> Pause
                    </>
                  ) : mode === "paused" ? (
                    <>
                      <Play size={20} fill="currentColor" /> Resume
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" /> Run
                    </>
                  )}
                </button>
              </div>
              {hint && (
                <p className="hint-text">
                  <Lightbulb size={17} />
                  {level.hint} Follow the faint outlines if you need a hand.
                </p>
              )}
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
              <div className="board-foot">
                <span>
                  <Move size={15} /> Drag a part. Rotate it. Press Run.
                </span>
                <button className="text-button" onClick={() => leaderboard()}>
                  <Trophy size={17} /> Best builds
                </button>
              </div>
            </div>
            <aside className="parts-panel">
              <div className="parts-title">
                <h2>Your parts</h2>
                <Wrench size={20} />
              </div>
              <p className="quiet">Tap to add. Drag to move.</p>
              <div className="palette">
                {(Object.keys(level.inventory) as PartKind[]).map((kind) => {
                  const left =
                    (level.inventory[kind] || 0) -
                    parts.filter((p) => p.kind === kind).length;
                  return (
                    <button
                      key={kind}
                      className={`part-button ${tool === kind ? "selected-tool" : ""}`}
                      onPointerDown={(e) => paletteDown(e, kind)}
                      disabled={mode !== "build" || left === 0}
                      aria-label={`Add ${PARTS[kind].label}`}
                      onClick={() => {
                        if (draggedPalette.current) {
                          draggedPalette.current = false;
                          return;
                        }
                        stagePart(kind);
                      }}
                    >
                      <PartIcon kind={kind} />
                      <div>
                        <b>{PARTS[kind].label}</b>
                        <small>RM{PARTS[kind].cost}</small>
                      </div>
                      <span className="part-count">{left}</span>
                    </button>
                  );
                })}
              </div>
              <div className="budget">
                <span>Build cost</span>
                <strong>
                  RM{costOf(parts)} <small>/ {level.budget}</small>
                </strong>
                <div className="budget-track">
                  <span
                    style={{
                      width: `${(costOf(parts) / level.budget) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="selection-tools">
                <span className="tool-heading">
                  {selectedPart
                    ? `${PARTS[selectedPart.kind].label} · ${selectedPart.angle}°`
                    : "SELECT A PART TO EDIT"}
                </span>
                <div className="tool-row">
                  <button
                    className="tool-button"
                    aria-label="Rotate left"
                    title="Rotate left 5 degrees"
                    onClick={() => rotate(-5)}
                    disabled={!selectedPart || mode !== "build"}
                  >
                    <RotateCcw />
                  </button>
                  <button
                    className="tool-button"
                    aria-label="Rotate right"
                    title="Rotate right 5 degrees"
                    onClick={() => rotate(5)}
                    disabled={!selectedPart || mode !== "build"}
                  >
                    <RotateCw />
                  </button>
                  <button
                    className="tool-button"
                    aria-label="Delete selected part"
                    onClick={() => {
                      setParts(parts.filter((p) => p.id !== selected));
                      setSelected(null);
                    }}
                    disabled={!selectedPart || mode !== "build"}
                  >
                    <Trash2 />
                  </button>
                </div>
                {selectedPart && mode === "build" && (
                  <div className="position-controls">
                    <label>
                      X{" "}
                      <input
                        aria-label="Part X position"
                        type="number"
                        min="35"
                        max="925"
                        value={selectedPart.x}
                        onChange={(e) =>
                          changeSelected({
                            x: Math.max(
                              35,
                              Math.min(925, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Y{" "}
                      <input
                        aria-label="Part Y position"
                        type="number"
                        min="160"
                        max="495"
                        value={selectedPart.y}
                        onChange={(e) =>
                          changeSelected({
                            y: Math.max(
                              160,
                              Math.min(495, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="nudge-controls">
                      <button
                        aria-label="Move left"
                        onClick={() =>
                          changeSelected({
                            x: Math.max(35, selectedPart.x - 5),
                          })
                        }
                      >
                        <ArrowLeft size={15} />
                      </button>
                      <button
                        aria-label="Move up"
                        onClick={() =>
                          changeSelected({
                            y: Math.max(160, selectedPart.y - 5),
                          })
                        }
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        aria-label="Move down"
                        onClick={() =>
                          changeSelected({
                            y: Math.min(495, selectedPart.y + 5),
                          })
                        }
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        aria-label="Move right"
                        onClick={() =>
                          changeSelected({
                            x: Math.min(925, selectedPart.x + 5),
                          })
                        }
                      >
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
                <button
                  className="reset-button"
                  disabled={mode !== "build"}
                  onClick={() => {
                    setParts([]);
                    setSelected(null);
                    setError("");
                  }}
                >
                  <Undo2 size={16} /> Reset all parts
                </button>
              </div>
              {best && (
                <div className="personal-best">
                  <Trophy size={20} />
                  <div>
                    <span>YOUR PERSONAL BEST</span>
                    <Stars count={best.stars} />
                    <small>
                      RM{best.cost} · {best.parts} parts · {best.time}s
                    </small>
                  </div>
                  <button
                    className="text-button"
                    disabled={mode !== "build"}
                    onClick={() => {
                      setParts(best.best_build);
                      setSelected(null);
                    }}
                  >
                    Load
                  </button>
                </div>
              )}
            </aside>
          </div>
        </section>
      )}
      <footer>
        MADE FOR CURIOUS MINDS{" "}
        <span>
          {demo
            ? "DEMO PROGRESS SAVED · SCHOOL DATA NOT CONNECTED"
            : "SEASON 1 · MOTION LAB"}
        </span>
      </footer>
      <Dialog
        open={!!chosen}
        onOpenChange={(v) => {
          if (!v && !busy) setChosen(null);
        }}
      >
        <DialogContent className="lab-dialog">
          <div className="confirm-avatar">{chosen?.fullname[0]}</div>
          <DialogTitle>Is this you?</DialogTitle>
          <DialogDescription>Check your name and class.</DialogDescription>
          <div className="confirm-name">
            <b>{chosen?.fullname}</b>
            <span>{chosen?.class_name}</span>
          </div>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <button className="primary full" disabled={busy} onClick={login}>
            {busy ? (
              "Opening your lab…"
            ) : (
              <>
                This is me <Check size={20} />
              </>
            )}
          </button>
          <button
            className="text-button centered"
            disabled={busy}
            onClick={() => setChosen(null)}
          >
            Choose another name
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent
          className={`lab-dialog result-dialog ${result?.won ? "won" : ""}`}
        >
          <div className="result-icon">
            {result?.won ? <Trophy size={45} /> : <Wrench size={42} />}
          </div>
          <DialogTitle>
            {result?.won
              ? levelId === LEVELS.length
                ? "Motion Lab complete!"
                : "You made it!"
              : "One more idea?"}
          </DialogTitle>
          <DialogDescription>
            {result?.won
              ? levelId === 10
                ? "Two goals reached! Motion Master badge earned."
                : "That's what an inventor does."
              : result?.reason || "Move a part. Change the angle. Try again."}
          </DialogDescription>
          {result?.won && (
            <>
              <Stars count={result.stars} />
              <div className="result-stats">
                <span>
                  <b>RM{result.cost}</b>Cost
                </span>
                <span>
                  <b>{result.parts}</b>Parts
                </span>
                <span>
                  <b>{result.time}s</b>Time
                </span>
              </div>
            </>
          )}
          <p className={`save-status ${saveState}`} aria-live="polite">
            {saveState === "saving"
              ? "Saving your build…"
              : saveState === "failed"
                ? "Not saved yet. Your build is still here."
                : result?.won
                  ? newBest
                    ? "New personal best · saved!"
                    : "Build saved!"
                  : "Ready for your next try."}
          </p>
          {saveState === "failed" && (
            <button className="primary full" onClick={save}>
              Retry saving
            </button>
          )}
          {result?.won && saveState === "saved" && (
            <button
              className="primary full"
              onClick={() => {
                if (levelId < LEVELS.length) openLevel(levelId + 1);
                else {
                  setResultOpen(false);
                  setScreen("hub");
                }
              }}
            >
              {levelId < LEVELS.length ? "Next challenge" : "Back to the lab"}
              <ArrowRight size={20} />
            </button>
          )}
          <button
            className={result?.won ? "secondary full" : "primary full"}
            disabled={saveState === "saving"}
            onClick={edit}
          >
            {result?.won ? "Make it even better" : "Keep building"}
            <Wrench size={18} />
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={boardOpen} onOpenChange={setBoardOpen}>
        <DialogContent className="lab-dialog leaderboard-dialog">
          <Trophy className="trophy-icon" size={35} />
          <DialogTitle>Best builds</DialogTitle>
          <DialogDescription>
            {LEVELS[rankLevel - 1].name} · Highest score wins. Save parts, cost
            and time.
          </DialogDescription>
          <div className="leaderboard-tabs">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                className={l.id === rankLevel ? "active" : ""}
                onClick={() => leaderboard(l.id)}
              >
                0{l.id} {l.name}
              </button>
            ))}
          </div>
          {rankLoading ? (
            <p>Loading builds…</p>
          ) : rankError ? (
            <p role="alert">{rankError}</p>
          ) : !rankings.length ? (
            <div className="empty-ranks">
              <Wrench size={30} />
              <b>The first spot could be yours.</b>
              <p>Finish this challenge to join the board.</p>
            </div>
          ) : (
            <ol className="rankings">
              {rankings.map((r, i) => (
                <li
                  key={`${r.fullname}-${i}`}
                  className={r.is_you ? "your-rank" : ""}
                >
                  <span className="rank-number">{i + 1}</span>
                  <div>
                    <b>
                      {r.fullname}
                      {r.is_you ? " · YOU" : ""}
                    </b>
                    <small>
                      {r.class_name} · RM{r.cost} · {r.time}s
                    </small>
                  </div>
                  <strong>{r.score.toLocaleString()}</strong>
                </li>
              ))}
            </ol>
          )}
          {progress.find((p) => p.level_id === rankLevel) && (
            <p className="quiet">
              Your best:{" "}
              {progress
                .find((p) => p.level_id === rankLevel)!
                .best_score.toLocaleString()}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
