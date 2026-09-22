import { currentStudent, json, unavailable } from "@/lib/server/http";
import { getWeekly } from "@/lib/server/store";
export async function GET(req: Request) {
  try {
    const s = await currentStudent(req);
    if (!s) return json({ error: "Choose your name first." }, 401);
    return json({ weekly: await getWeekly(s.student_id) });
  } catch {
    return unavailable();
  }
}
