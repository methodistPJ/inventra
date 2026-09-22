/** Rewards derive from durable completion records, never attempts or browser state. */
export function makerProfile(progress: { level_id: number; stars: number }[]) {
  const unique = [...new Map(progress.map((p) => [p.level_id, p])).values()];
  const stars = unique.reduce((s, p) => s + p.stars, 0);
  const xp = unique.length * 100 + stars * 25;
  return {
    xp,
    coins: unique.length * 20 + stars * 5,
    level: 1 + Math.floor(xp / 250),
    badges: [
      unique.length ? "First Build" : "",
      unique.length >= 3 ? "Motion Explorer" : "",
      unique.some((p) => p.level_id === 9) ? "Gentle Landing" : "",
      unique.some((p) => p.level_id === 10) ? "Motion Master" : "",
      stars === 30 ? "Thirty Stars" : "",
    ].filter(Boolean),
  };
}
export function weeklyChallenge(now = new Date()) {
  // Malaysia Monday midnight; fixed epoch keeps browser, Worker and SQL identical.
  const index = Math.floor(
    (now.getTime() - Date.parse("2026-09-20T16:00:00Z")) / 604800000,
  );
  const start = new Date(
    Date.parse("2026-09-20T16:00:00Z") + index * 604800000,
  );
  return {
    week: start.toISOString(),
    ends: new Date(start.getTime() + 604800000).toISOString(),
    level: 1 + (((index % 3) + 3) % 3),
  };
}
export type WeeklyBoard = {
  challenge: ReturnType<typeof weeklyChallenge>;
  cost: {
    fullname: string;
    class_name: string;
    value: number;
    is_you: boolean;
  }[];
  parts: {
    fullname: string;
    class_name: string;
    value: number;
    is_you: boolean;
  }[];
  time: {
    fullname: string;
    class_name: string;
    value: number;
    is_you: boolean;
  }[];
  classes: { class_name: string; contributors: number; points: number }[];
};
