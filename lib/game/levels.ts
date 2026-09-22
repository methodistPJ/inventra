export type PartKind = "ramp" | "beam" | "spring";
export type Placement = {
  id: string;
  kind: PartKind;
  x: number;
  y: number;
  angle: number;
};
export type Platform = {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
};
export type Level = {
  id: number;
  name: string;
  verb: string;
  hint: string;
  color: string;
  spawn: { x: number; y: number; vx?: number };
  goal: { x: number; y: number; width: number };
  platforms: Platform[];
  inventory: Partial<Record<PartKind, number>>;
  budget: number;
  parCost: number;
  parTime: number;
  solution: Placement[];
};
export const WORLD = {
  width: 960,
  height: 540,
  dt: 1000 / 60,
  maxTicks: 1200,
  version: "motion-1.0.0",
} as const;
export const PARTS = {
  ramp: { label: "Ramp", width: 360, height: 18, cost: 25, color: "#f2b46d" },
  beam: { label: "Beam", width: 240, height: 18, cost: 15, color: "#8caec9" },
  spring: {
    label: "Spring",
    width: 76,
    height: 20,
    cost: 40,
    color: "#b2ed7c",
  },
} as const;
export const LEVELS: Level[] = [
  {
    id: 1,
    name: "First Motion",
    verb: "Roll into the goal",
    hint: "A slope gets things rolling.",
    color: "#b2ed7c",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 150 },
    platforms: [{ x: 760, y: 501, width: 350, height: 30 }],
    inventory: { ramp: 2, beam: 1 },
    budget: 65,
    parCost: 50,
    parTime: 7,
    solution: [
      { id: "r1", kind: "ramp", x: 330, y: 270, angle: 20 },
      { id: "r2", kind: "ramp", x: 490, y: 330, angle: 20 },
    ],
  },
  {
    id: 2,
    name: "Mind the Gap",
    verb: "Bridge the gap",
    hint: "Join your beams. Keep a little slope.",
    color: "#94c9ef",
    spawn: { x: 100, y: 150 },
    goal: { x: 830, y: 440, width: 140 },
    platforms: [
      { x: 160, y: 280, width: 280, height: 22, angle: 15 },
      { x: 840, y: 501, width: 240, height: 30 },
    ],
    inventory: { beam: 3 },
    budget: 45,
    parCost: 45,
    parTime: 8,
    solution: [
      { id: "b1", kind: "beam", x: 390, y: 340, angle: 10 },
      { id: "b2", kind: "beam", x: 610, y: 380, angle: 10 },
      { id: "b3", kind: "beam", x: 700, y: 400, angle: 15 },
    ],
  },
  {
    id: 3,
    name: "Launch It",
    verb: "Reach the high goal",
    hint: "Roll onto a spring. Aim it at the goal.",
    color: "#cca9ff",
    spawn: { x: 150, y: 150 },
    goal: { x: 800, y: 270, width: 150 },
    platforms: [{ x: 800, y: 331, width: 200, height: 30 }],
    inventory: { ramp: 1, spring: 1, beam: 1 },
    budget: 80,
    parCost: 65,
    parTime: 8,
    solution: [
      { id: "r1", kind: "ramp", x: 285, y: 320, angle: 25 },
      { id: "s1", kind: "spring", x: 500, y: 440, angle: 50 },
    ],
  },
];
export function levelById(id: number): Level {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error("Unknown level");
  return level;
}
export function costOf(parts: Placement[]) {
  return parts.reduce((sum, p) => sum + PARTS[p.kind].cost, 0);
}
