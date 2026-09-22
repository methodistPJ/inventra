import { test, expect } from "@playwright/test";
test("mouse drag from palette, reposition part and overlapping placement", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox").fill("aya");
  await page.getByRole("option", { name: /MAYA/ }).click();
  await page.getByRole("button", { name: "This is me" }).click();
  await page
    .getByRole("button", { name: /Let’s build|Build again/ })
    .first()
    .click();
  const palette = await page
    .getByRole("button", { name: "Add Ramp", exact: true })
    .boundingBox();
  const board = await page.getByTestId("game-board").boundingBox();
  const x = board!.x + board!.width * 0.4,
    y = board!.y + board!.height * 0.6;
  await page.mouse.move(palette!.x + 20, palette!.y + 20);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator(".budget strong")).toContainText("RM25");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y + 25, { steps: 10 });
  await page.mouse.up();
  await expect(
    page.getByRole("spinbutton", { name: "Part X position" }),
  ).not.toHaveValue("384");
  await page.getByRole("button", { name: "Add Ramp", exact: true }).click();
  await page.mouse.click(x + 50, y + 25);
  await expect(page.locator(".budget strong")).toContainText("RM50");
  await page.getByRole("button", { name: "Reset all parts" }).click();
  await expect(page.locator(".budget strong")).toContainText("RM0");
});
