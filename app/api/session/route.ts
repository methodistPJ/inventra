import {
  isDemo,
  student,
  seedDemo,
  putSession,
  deleteSession,
  getProgress,
} from "@/lib/server/store";
import {
  json,
  limited,
  unavailable,
  currentStudent,
  sameOrigin,
  body,
  hash,
  sessionToken,
  sessionCookie,
} from "@/lib/server/http";
export async function GET(req: Request) {
  try {
    await seedDemo();
    const s = await currentStudent(req);
    return json({
      demo: isDemo(),
      student: s,
      progress: s ? await getProgress(s.student_id) : [],
    });
  } catch {
    return unavailable();
  }
}
export async function POST(req: Request) {
  let data;
  try {
    data = await body(req);
  } catch {
    return json({ error: "Invalid or oversized request." }, 400);
  }
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  try {
    if (await limited(req, "login", 30))
      return json({ error: "Please wait a moment." }, 429);
    if (data.confirmed !== true || typeof data.student_id !== "string")
      return json({ error: "Choose your name and confirm." }, 400);
    const s = await student(data.student_id);
    if (!s) return json({ error: "Name not found. Try again." }, 404);
    const old = sessionToken(req);
    if (old) await deleteSession(await hash(old));
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    await seedDemo();
    await putSession(
      await hash(token),
      s.student_id,
      Date.now() + 7 * 86400000,
    );
    return json(
      { student: s, progress: await getProgress(s.student_id), demo: isDemo() },
      200,
      { "Set-Cookie": sessionCookie(req, token) },
    );
  } catch {
    return unavailable();
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
  try {
    const token = sessionToken(req);
    if (token) await deleteSession(await hash(token));
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, "", 0) });
  } catch {
    return unavailable();
  }
}
