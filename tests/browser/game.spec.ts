import { test, expect, type Page } from "@playwright/test";
import { LEVELS, type Placement, PARTS } from "../../lib/game/levels";
async function login(page: Page, name = "Ada") {
  await page.goto("/");
  await page.getByRole("combobox").fill(name);
  await page.getByRole("option", { name: new RegExp(name, "i") }).click();
  await expect(
    page.getByRole("heading", { name: "Is this you?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "This is me" }).click();
  await expect(
    page.getByRole("heading", { name: "Motion Lab." }),
  ).toBeVisible();
}
async function place(page: Page, p: Placement) {
  await page
    .getByRole("button", { name: `Add ${PARTS[p.kind].label}`, exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Part X position" })
    .fill(String(p.x));
  await page
    .getByRole("spinbutton", { name: "Part Y position" })
    .fill(String(p.y));
  const start = p.kind === "spring" ? 45 : 15;
  for (let a = start; a !== p.angle; a += Math.sign(p.angle - start) * 5)
    await page
      .getByRole("button", {
        name: p.angle > start ? "Rotate right" : "Rotate left",
        exact: true,
      })
      .click();
}
test("complete all ten challenges, retry saving, reload and restore personal best", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page
    .getByRole("button", { name: /Let’s build|Build again/ })
    .first()
    .click();
  for (const l of LEVELS) {
    await expect(
      page.getByRole("heading", { name: l.name, exact: true }),
    ).toBeVisible();
    for (const p of l.solution) await place(page, p);
    if (l.id === 1) {
      await page.screenshot({
        path: "work/editor-desktop.png",
        fullPage: true,
      });
      let first = true;
      await page.route("**/api/attempts", async (route) => {
        if (first) {
          first = false;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Test connection interruption" }),
          });
        } else await route.continue();
      });
    }
    await page.getByRole("button", { name: "Run", exact: true }).click();
    if (l.id === 1) {
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(
        page.getByText("PAUSED", { exact: true }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
    }
    await expect(
      page.getByRole("heading", {
        name: l.id === LEVELS.length ? "Motion Lab complete!" : "You made it!",
      }),
    ).toBeVisible();
    if (l.id === 1) {
      await expect(
        page.getByRole("button", { name: "Retry saving" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Retry saving" }).click();
      await page.unroute("**/api/attempts");
    }
    await expect(page.getByText(/saved!/).first()).toBeVisible();
    await page
      .getByRole("button", {
        name: l.id < LEVELS.length ? "Next challenge" : "Back to the lab",
        exact: true,
      })
      .click();
  }
  await page.reload();
  await expect(page.getByRole("button", { name: "Build again" })).toHaveCount(
    10,
  );
  await page.getByRole("button", { name: "Best builds", exact: true }).click();
  await expect(page.locator(".rankings")).toContainText("ADA INVENTOR");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Build again" }).first().click();
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.locator(".budget strong")).toContainText("RM50");
  await page.screenshot({ path: "work/editor-saved.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("mobile name search, touch placement, deletion and reset", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await login(page, "aya");
  await page.screenshot({ path: "work/hub-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: /Let’s build|Build again/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add Ramp", exact: true }).tap();
  await expect(page.locator(".budget strong")).toContainText("RM25");
  await expect(
    page.getByRole("spinbutton", { name: "Part X position" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rotate right", exact: true }).tap();
  await page
    .getByRole("button", { name: "Delete selected part", exact: true })
    .tap();
  await expect(page.locator(".budget strong")).toContainText("RM0");
  await page.getByRole("button", { name: "Add Beam", exact: true }).tap();
  await expect(page.locator(".budget strong")).toContainText("RM20");
  await page.getByRole("button", { name: "Reset all parts" }).tap();
  await expect(page.locator(".budget strong")).toContainText("RM0");
  await page.screenshot({ path: "work/editor-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
test("API rejects forged scores, locked levels, anonymous and cross-origin saves", async ({
  request,
}) => {
  const root = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
  const make = (id: number) => ({
    attempt_id: crypto.randomUUID(),
    level_id: id,
    build: LEVELS[id - 1].solution,
    score: 999999,
  });
  expect(
    (
      await request.post("/api/attempts", {
        data: make(1),
        headers: { Origin: root },
      })
    ).status(),
  ).toBe(401);
  await request.get("/api/session");
  await request.post("/api/session", {
    data: { student_id: "DEMO-BEN", confirmed: true },
    headers: { Origin: root },
  });
  expect(
    (
      await request.post("/api/attempts", {
        data: make(3),
        headers: { Origin: root },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/attempts", {
        data: make(1),
        headers: { Origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  const a = make(1);
  const r = await request.post("/api/attempts", {
    data: a,
    headers: { Origin: root },
  });
  expect(r.status()).toBe(200);
  const d = await r.json();
  expect(d.result.score).toBe(6688);
  expect(d.result.won).toBe(true);
  const r2 = await request.post("/api/attempts", {
    data: a,
    headers: { Origin: root },
  });
  expect((await r2.json()).progress).toEqual(d.progress);
  expect(
    (
      await request.post("/api/attempts", {
        data: {
          ...make(1),
          build: [{ id: "evil", kind: "spring", x: 400, y: 300, angle: 0 }],
        },
        headers: { Origin: root },
      })
    ).status(),
  ).toBe(400);
  await request.delete("/api/session", { headers: { Origin: root } });
  expect((await request.get("/api/leaderboard?level=1")).status()).toBe(401);
});
