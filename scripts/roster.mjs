import { createHash } from "node:crypto";
export function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function validateRoster(values) {
  if (!Array.isArray(values) || values.length < 2)
    throw new Error("Roster is empty");
  const headers = values[0].map((v) =>
    String(v)
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  const expected = ["student_id", "fullname", "year", "class", "active"];
  if (expected.some((h) => headers.filter((v) => v === h).length !== 1))
    throw new Error(
      "Required unique headers: student_id, fullname, year, class, active",
    );
  const ids = new Set();
  const duplicateNames = new Map();
  let duplicateNameCount = 0;
  const rows = values
    .slice(1)
    .filter((r) => r.some((v) => String(v).trim()))
    .map((r, i) => {
      const value = Object.fromEntries(
        expected.map((h) => [h, String(r[headers.indexOf(h)] ?? "").trim()]),
      );
      const fail = (message) => {
        throw new Error(`Row ${i + 2}: ${message}`);
      };
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(value.student_id))
        fail("invalid student_id");
      if (ids.has(value.student_id)) fail("duplicate student_id");
      ids.add(value.student_id);
      if (value.fullname.length < 2 || value.fullname.length > 200)
        fail("invalid fullname");
      if (!/^[2-6]$/.test(value.year)) fail("year must be 2–6");
      if (!value.class || value.class.length > 80) fail("invalid class");
      if (
        /^[1-6]\s/.test(value.class) &&
        Number(value.class[0]) !== Number(value.year)
      )
        fail("class/year mismatch");
      if (!/^(true|false)$/i.test(value.active))
        fail("active must be TRUE or FALSE");
      const nameKey =
        value.fullname.toUpperCase() + ":" + value.class.toUpperCase();
      if (duplicateNames.has(nameKey)) duplicateNameCount++;
      duplicateNames.set(nameKey, true);
      return {
        student_id: value.student_id,
        fullname: value.fullname,
        year: Number(value.year),
        class: value.class.toUpperCase(),
        active: value.active.toLowerCase() === "true",
      };
    });
  if (rows.length > 5000) throw new Error("Maximum 5000 pupils per import");
  rows.sort((a, b) => a.student_id.localeCompare(b.student_id));
  const hash = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  return {
    rows,
    hash,
    summary: {
      pupils: rows.length,
      active: rows.filter((r) => r.active).length,
      inactive: rows.filter((r) => !r.active).length,
      classes: new Set(rows.map((r) => `${r.year}:${r.class}`)).size,
      duplicateNameCount,
    },
  };
}
