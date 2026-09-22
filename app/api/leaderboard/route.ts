import { currentStudent, json, unavailable } from "@/lib/server/http";
import { getLeaderboard } from "@/lib/server/store";
import { LEVELS } from "@/lib/game/levels";
export async function GET(req: Request) {
  try {
    const s = await currentStudent(req);
    if (!s) return json({ error: "Choose your name first." }, 401);
    const level = Number(new URL(req.url).searchParams.get("level") || 1);
    if (!LEVELS.some((l) => l.id === level))
      return json({ error: "Unknown challenge" }, 400);
    return json({ records: await getLeaderboard(s.student_id, level) });
  } catch {
    return unavailable();
  }
}
