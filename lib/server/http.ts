import "server-only";
import { getSession, student, rateLimit } from "./store";
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function sessionToken(req: Request) {
  return (
    /(?:^|;\s*)inventra_session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.get("cookie") || "",
    )?.[1] || ""
  );
}
export async function currentStudent(req: Request) {
  const token = sessionToken(req);
  if (!token) return null;
  const id = await getSession(await hash(token));
  return id ? student(id) : null;
}
export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !!origin && origin === new URL(req.url).origin;
}
export async function limited(req: Request, action: string, max: number) {
  const ip = req.headers.get("cf-connecting-ip") || "local";
  return !(await rateLimit(`${action}:${await hash(ip)}`, max, 60));
}
export function sessionCookie(req: Request, token: string, days = 7) {
  return `inventra_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${days * 86400}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 12000) {
    await req.body?.cancel();
    throw new Error("Request too large");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Request body required");
  const decoder = new TextDecoder();
  let text = "",
    length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 12000) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text);
}
export function unavailable() {
  return json({ error: "The lab could not connect. Please try again." }, 503);
}
