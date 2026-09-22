export type PartKind =
  | "ramp"
  | "beam"
  | "spring"
  | "wheel"
  | "pivot"
  | "rough"
  | "smooth"
  | "cushion"
  | "platform";
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
  alternatives?: Placement[][];
  cargo?: "box" | "egg";
  second?: {
    spawn: { x: number; y: number };
    goal: { x: number; y: number; width: number };
  };
  settleTicks?: number;
  parParts?: number;
};
export const WORLD = {
  width: 960,
  height: 540,
  dt: 1000 / 60,
  maxTicks: 1200,
  version: "motion-2.0.0",
} as const;
export const PARTS = {
  ramp: { label: "Ramp", width: 360, height: 18, cost: 25, color: "#f2b46d" },
  beam: { label: "Beam", width: 240, height: 18, cost: 20, color: "#8caec9" },
  wheel: { label: "Wheel", width: 44, height: 44, cost: 15, color: "#88cad8" },
  pivot: { label: "Pivot", width: 220, height: 18, cost: 30, color: "#efca66" },
  rough: {
    label: "Rough Pad",
    width: 160,
    height: 18,
    cost: 10,
    color: "#cc9777",
  },
  smooth: {
    label: "Smooth Pad",
    width: 160,
    height: 18,
    cost: 10,
    color: "#9ae7e0",
  },
  cushion: {
    label: "Cushion",
    width: 160,
    height: 30,
    cost: 20,
    color: "#e6a5cf",
  },
  platform: {
    label: "Platform",
    width: 200,
    height: 24,
    cost: 25,
    color: "#a4b6ed",
  },
  spring: {
    label: "Spring",
    width: 76,
    height: 20,
    cost: 35,
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
    budget: 70,
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
    budget: 60,
    parCost: 60,
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
const rampRoute: Placement[] = [
  { id: "r1", kind: "ramp", x: 330, y: 270, angle: 20 },
  { id: "r2", kind: "ramp", x: 490, y: 330, angle: 20 },
];
LEVELS.push(
  {
    id: 4,
    name: "Faster Route",
    verb: "Find a faster way",
    hint: "Steeper slopes build speed. Try a shorter route.",
    color: "#ffca70",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 150 },
    platforms: [],
    inventory: { ramp: 2, beam: 2, smooth: 2 },
    budget: 100,
    parCost: 75,
    parTime: 3,
    solution: rampRoute,
  },
  {
    id: 5,
    name: "Heavy Cargo",
    verb: "Deliver the crate",
    hint: "A crate slides. Wheels help it roll over a gap.",
    color: "#e5aa72",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 170 },
    platforms: [],
    inventory: { ramp: 2, beam: 3, wheel: 2 },
    budget: 160,
    parCost: 115,
    parTime: 10,
    parParts: 4,
    cargo: "box",
    solution: rampRoute,
  },
  {
    id: 6,
    name: "Slippery Path",
    verb: "Slide, then stop",
    hint: "Smooth pads help you slide. Rough pads slow you down.",
    color: "#9ae7e0",
    spawn: { x: 100, y: 150 },
    goal: { x: 830, y: 440, width: 140 },
    platforms: [{ x: 160, y: 280, width: 280, height: 22, angle: 15 }],
    inventory: { beam: 3, rough: 2, smooth: 2 },
    budget: 100,
    parCost: 95,
    parTime: 10,
    settleTicks: 90,
    solution: LEVELS[1].solution,
  },
  {
    id: 7,
    name: "Balance Point",
    verb: "Deliver and hold steady",
    hint: "The yellow pivot tips. Keep the cargo steady in its goal.",
    color: "#efca66",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 180 },
    platforms: [],
    inventory: { beam: 3, pivot: 1, ramp: 2 },
    budget: 140,
    parCost: 110,
    parTime: 12,
    parParts: 5,
    cargo: "box",
    settleTicks: 180,
    solution: rampRoute,
  },
  {
    id: 8,
    name: "Bounce Back",
    verb: "Bounce up to the goal",
    hint: "Turn a spring to aim your bounce. One spring can be enough!",
    color: "#cca9ff",
    spawn: { x: 150, y: 150 },
    goal: { x: 800, y: 270, width: 150 },
    platforms: [{ x: 800, y: 331, width: 200, height: 30 }],
    inventory: { spring: 2, ramp: 2, beam: 2 },
    budget: 150,
    parCost: 105,
    parTime: 8,
    parParts: 3,
    solution: LEVELS[2].solution,
  },
  {
    id: 9,
    name: "Precision Drop",
    verb: "Land the egg safely",
    hint: "Pink cushions soften a landing. Avoid a hard fall.",
    color: "#e6a5cf",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 170 },
    platforms: [],
    inventory: { platform: 3, cushion: 2, ramp: 2 },
    budget: 150,
    parCost: 100,
    parTime: 10,
    parParts: 4,
    cargo: "egg",
    solution: rampRoute,
  },
  {
    id: 10,
    name: "Motion Master",
    verb: "Two balls. Two goals!",
    hint: "Build two routes. Guide each colour to its matching goal.",
    color: "#ffd76e",
    spawn: { x: 180, y: 120 },
    goal: { x: 720, y: 440, width: 150 },
    second: { spawn: { x: 780, y: 90 }, goal: { x: 240, y: 440, width: 150 } },
    platforms: [],
    inventory: {
      ramp: 4,
      beam: 3,
      spring: 2,
      wheel: 2,
      pivot: 1,
      rough: 2,
      smooth: 2,
      cushion: 2,
      platform: 2,
    },
    budget: 240,
    parCost: 175,
    parTime: 12,
    parParts: 7,
    solution: [
      ...rampRoute,
      { id: "r3", kind: "ramp", x: 650, y: 200, angle: -20 },
      { id: "r4", kind: "ramp", x: 480, y: 260, angle: -20 },
    ],
  },
);
LEVELS[8].solution = [
  ...rampRoute,
  { id: "c1", kind: "cushion", x: 700, y: 490, angle: 0 },
];
LEVELS[3].alternatives = [
  [
    { id: "r1", kind: "ramp", x: 310, y: 210, angle: 30 },
    { id: "r2", kind: "ramp", x: 420, y: 280, angle: 30 },
  ],
  [
    { id: "r1", kind: "ramp", x: 310, y: 270, angle: 20 },
    { id: "r2", kind: "ramp", x: 490, y: 330, angle: 20 },
  ],
];
LEVELS[7].goal = { x: 780, y: 270, width: 220 };
LEVELS[7].platforms = [{ x: 780, y: 331, width: 270, height: 30 }];
LEVELS[7].solution = [
  { id: "r1", kind: "ramp", x: 265, y: 320, angle: 25 },
  { id: "s1", kind: "spring", x: 480, y: 440, angle: 45 },
];
LEVELS[7].alternatives = [
  [
    { id: "r1", kind: "ramp", x: 275, y: 320, angle: 25 },
    { id: "s1", kind: "spring", x: 490, y: 440, angle: 40 },
  ],
  [
    { id: "r1", kind: "ramp", x: 305, y: 320, angle: 25 },
    { id: "s1", kind: "spring", x: 520, y: 440, angle: 55 },
  ],
];
Object.assign(LEVELS[9], {
  spawn: { x: 480, y: 100 },
  goal: { x: 820, y: 440, width: 150 },
  second: { spawn: { x: 400, y: 100 }, goal: { x: 140, y: 440, width: 150 } },
  solution: [
    { id: "r1", kind: "ramp", x: 580, y: 300, angle: 10 },
    { id: "r2", kind: "ramp", x: 300, y: 300, angle: -10 },
  ],
});
export function levelById(id: number): Level {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error("Unknown level");
  return level;
}
export function costOf(parts: Placement[]) {
  return parts.reduce((sum, p) => sum + PARTS[p.kind].cost, 0);
}
