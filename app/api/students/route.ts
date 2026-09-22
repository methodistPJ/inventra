import { searchStudents } from "@/lib/server/store";
import { json, limited, unavailable } from "@/lib/server/http";
export async function GET(req: Request) {
  try {
    if (await limited(req, "search", 120))
      return json({ error: "Please wait a moment." }, 429);
    const q = (new URL(req.url).searchParams.get("q") || "").trim();
    if (q.length < 2) return json({ students: [] });
    if (q.length > 80 || /[%_*,()\\]/.test(q)) return json({ students: [] });
    return json({ students: await searchStudents(q) });
  } catch {
    return unavailable();
  }
}
