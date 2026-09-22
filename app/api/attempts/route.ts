import {
  currentStudent,
  json,
  body,
  sameOrigin,
  unavailable,
} from "@/lib/server/http";
import { getProgress, saveAttempt, rateLimit } from "@/lib/server/store";
import { levelById } from "@/lib/game/levels";
import { replay, validateBuild } from "@/lib/game/physics";
export async function POST(req: Request) {
  // Drain a bounded request before early rejection so Worker keep-alive clients
  // can safely reuse the connection for their next request.
  let data;
  try {
    data = await body(req);
  } catch {
    return json({ error: "Invalid or oversized request." }, 400);
  }
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  try {
    const s = await currentStudent(req);
    if (!s) return json({ error: "Choose your name first." }, 401);
    if (!(await rateLimit(`attempt:${s.student_id}`, 20, 60)))
      return json(
        { error: "Take a little break. Try saving again shortly." },
        429,
      );
    let level, parts;
    try {
      if (
        !Number.isInteger(data.level_id) ||
        typeof data.attempt_id !== "string" ||
        !/^[a-f0-9-]{36}$/.test(data.attempt_id)
      )
        throw new Error();
      level = levelById(data.level_id);
      parts = validateBuild(level, data.build);
    } catch {
      return json({ error: "This build needs a small adjustment." }, 400);
    }
    const progress = await getProgress(s.student_id);
    if (level.id > 1 && !progress.some((p) => p.level_id === level.id - 1))
      return json({ error: "Finish the previous challenge first." }, 403);
    const result = replay(level, parts);
    await saveAttempt(s.student_id, data.attempt_id, level.id, parts, result);
    return json({ result, progress: await getProgress(s.student_id) });
  } catch {
    return unavailable();
  }
}
