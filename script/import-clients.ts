import { readFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { db } from "../server/db";
import { clients, type InsertClient } from "../shared/schema";

function findColumnKey(row: any, candidates: string[]): string | null {
  const entries = Object.keys(row || {}).map((key) => ({
    original: key,
    normalized: key.toString().toLowerCase().trim(),
  }));

  for (const cand of candidates) {
    const target = cand.toLowerCase();
    const match = entries.find((e) => e.normalized.includes(target));
    if (match) return match.original;
  }
  return null;
}

async function importClients() {
  const xlsxPath = join(
    process.cwd(),
    "attached_assets",
    "Clients_149_Cleaned.xlsx",
  );

  console.log("📄 Reading Excel file:", xlsxPath);
  const fileBuffer = readFileSync(xlsxPath);

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    console.error("❌ No rows found in Excel sheet");
    process.exit(1);
  }

  const sample = rows[0];

  const nameKey =
    findColumnKey(sample, [
      "nom/prénom",
      "nom prénom",
      "nom et prénom",
      "nom",
      "client",
    ]) ?? Object.keys(sample)[0];

  const phoneKey =
    findColumnKey(sample, [
      "téléphone",
      "telephone",
      "tel",
      "gsm",
      "numero",
      "numéro",
    ]) ?? Object.keys(sample)[1] ?? nameKey;

  const remarkKey =
    findColumnKey(sample, ["remarque", "note", "commentaire", "obs"]) ??
    Object.keys(sample)[2] ??
    nameKey;

  console.log("✅ Detected columns:");
  console.log("   Nom/Prénom :", nameKey);
  console.log("   Téléphone  :", phoneKey);
  console.log("   Remarque   :", remarkKey);

  const existing = await db.select().from(clients);
  const existingKey = new Set(
    existing.map(
      (c) =>
        `${c.nomPrenom.toLowerCase().trim()}|${(c.numeroTelephone ?? "")
          .toLowerCase()
          .trim()}`,
    ),
  );

  const toInsert: InsertClient[] = [];

  for (const row of rows) {
    const rawName = String(row[nameKey] ?? "").trim();
    const rawPhone = String(row[phoneKey] ?? "").trim();
    const rawRemark = String(row[remarkKey] ?? "").trim();

    if (!rawName) continue;

    const key = `${rawName.toLowerCase()}|${rawPhone.toLowerCase()}`;
    if (existingKey.has(key)) continue;

    existingKey.add(key);

    toInsert.push({
      nomPrenom: rawName,
      numeroTelephone: rawPhone,
      remarque: rawRemark,
    });
  }

  if (!toInsert.length) {
    console.log("ℹ️ No new clients to insert (all already exist).");
    return;
  }

  console.log(`➡️ Inserting ${toInsert.length} clients into database...`);
  await db.insert(clients).values(toInsert);
  console.log("✅ Import completed.");
}

importClients().catch((err) => {
  console.error("❌ Error importing clients:", err);
  process.exit(1);
});

