import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseCSV, validateRoster } from "./roster.mjs";
const args = process.argv.slice(2),
  option = (name) =>
    args.find((a) => a.startsWith(name + "="))?.slice(name.length + 1);
async function main() {
  let values;
  const csv = option("--csv");
  if (csv) {
    values = parseCSV(await readFile(csv, "utf8"));
  } else if (args.includes("--sheet")) {
    const token = process.env.GOOGLE_SHEETS_ACCESS_TOKEN;
    if (!token)
      throw new Error(
        "Configure GOOGLE_SHEETS_ACCESS_TOKEN in the environment; never put it in a command or chat.",
      );
    const id = "1JCYQarwp48IKvD5v5crO9LPPxG5M092r5m02K9zgwy4";
    const range = "'Sheet1'!A1:E1000";
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok)
      throw new Error(`Google Sheets read failed (${response.status})`);
    const result = await response.json();
    values = result.values;
    if (values?.length === 1000)
      throw new Error(
        "The checked range is full. Review the sheet size before expanding the import range; no partial import is allowed.",
      );
  } else
    throw new Error(
      "Use --csv=private-roster/roster.csv or --sheet. Dry run is the default.",
    );
  const plan = validateRoster(values);
  console.log(
    JSON.stringify(
      { mode: "DRY RUN", ...plan.summary, sourceHash: plan.hash },
      null,
      2,
    ),
  );
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (args.includes("--apply"))
      throw new Error("Supabase server environment is not configured.");
    console.log(
      "Structure validated. Database comparison needs server credentials. No changes made.",
    );
    return;
  }
  if (new URL(url).hostname !== "idwldwefhbmyknimfwgz.supabase.co")
    throw new Error(
      "Unexpected Supabase project. Check the target before importing.",
    );
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("students")
      .select("student_id,fullname,active")
      .order("student_id")
      .range(from, from + 999);
    if (error)
      throw new Error(
        "Could not read the existing roster. Apply the migration first.",
      );
    existing.push(...data);
    if (data.length < 1000) break;
  }
  const byId = new Map(existing.map((r) => [r.student_id, r]));
  const changedNames = plan.rows.filter(
    (r) =>
      byId.has(r.student_id) &&
      byId.get(r.student_id).fullname.toUpperCase() !==
        r.fullname.toUpperCase(),
  ).length;
  const newCount = plan.rows.filter((r) => !byId.has(r.student_id)).length;
  const deactivations = plan.rows.filter(
    (r) => !r.active && byId.get(r.student_id)?.active,
  ).length;
  console.log(
    JSON.stringify(
      {
        newPupils: newCount,
        existingPupils: plan.rows.length - newCount,
        nameChanges: changedNames,
        explicitDeactivations: deactivations,
        missingPupils: "left unchanged",
      },
      null,
      2,
    ),
  );
  if (!args.includes("--apply")) {
    console.log(
      "No changes made. Review counts; use --apply --approve-hash=" +
        plan.hash +
        " to apply this exact roster.",
    );
    return;
  }
  if (option("--approve-hash") !== plan.hash)
    throw new Error(
      "Input differs from the approved dry run. Run a new dry run and use its hash.",
    );
  if (changedNames && !args.includes("--allow-name-changes"))
    throw new Error(
      "Existing student IDs have different names. Review the source before allowing name changes.",
    );
  const { data, error } = await db.rpc("inventra_import_roster", {
    p_rows: plan.rows,
  });
  if (error)
    throw new Error(
      "Import transaction failed. No partial roster was accepted.",
    );
  if (data !== plan.rows.length)
    throw new Error("Import count mismatch; inspect database before retrying.");
  console.log(
    `Imported ${data} pupils atomically. The Google master sheet was not changed.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
