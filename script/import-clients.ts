import { readFileSync } from "fs";
import { join } from "path";
import * as XLSX from "xlsx";
import { db } from "../server/db";
import { clients, type InsertClient } from "../shared/schema";
import { sql } from "drizzle-orm";

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

  const idKey = findColumnKey(sample, ["n°", "id", "numéro", "numero", "index"]) ?? Object.keys(sample)[0];
  const nameKey = findColumnKey(sample, ["nom/prénom", "nom prénom", "nom et prénom", "nom", "client"]) ?? Object.keys(sample)[1];
  const phoneKey = findColumnKey(sample, ["téléphone", "telephone", "tel", "gsm", "numero", "numéro"]) ?? Object.keys(sample)[2];
  const remarkKey = findColumnKey(sample, ["remarque", "note", "commentaire", "obs"]) ?? Object.keys(sample)[3];

  console.log("✅ Detected columns:");
  console.log("   ID         :", idKey);
  console.log("   Nom/Prénom :", nameKey);
  console.log("   Téléphone  :", phoneKey);
  console.log("   Remarque   :", remarkKey);

  // Clear existing clients to ensure exact match and order
  console.log("🧹 Clearing existing clients...");
  await db.delete(clients);

  const toInsert: InsertClient[] = [];

  for (const row of rows) {
    const rawId = parseInt(String(row[idKey] || "0").replace(/[^0-9]/g, ""));
    const rawName = String(row[nameKey] ?? "").trim();
    const rawPhone = String(row[phoneKey] ?? "").trim();
    const rawRemark = String(row[remarkKey] ?? "").trim();

    if (!rawName && !rawPhone) continue;

    // Handle two phone numbers or sub-client logic
    // Pattern: "Phone1 / Phone2" or "Phone1 - Name2: Phone2"
    let phone1 = rawPhone;
    let hasSub = false;
    let subName = "";
    let subPhone = "";

    if (rawPhone.includes("/") || rawPhone.includes("-") || rawPhone.includes("\n")) {
      const parts = rawPhone.split(/[\/\n-]/).map(p => p.trim());
      phone1 = parts[0];
      if (parts.length > 1) {
        hasSub = true;
        const subPart = parts[1];
        if (subPart.includes(":")) {
          const [n, p] = subPart.split(":").map(x => x.trim());
          subName = n;
          subPhone = p;
        } else {
          subPhone = subPart;
        }
      }
    }

    toInsert.push({
      uniqueNumber: rawId || null,
      nomPrenom: rawName,
      numeroTelephone: phone1,
      hasSubClient: hasSub,
      subClientName: subName || null,
      subClientPhone: subPhone || null,
      remarque: rawRemark,
    });
  }

  if (!toInsert.length) {
    console.log("ℹ️ No clients found to insert.");
    return;
  }

  console.log(`➡️ Inserting ${toInsert.length} clients into database...`);
  // Insert in batches or one by one to preserve order if needed, but values() preserves order in SQL usually
  await db.insert(clients).values(toInsert);
  console.log("✅ Import completed.");
}

importClients().catch((err) => {
  console.error("❌ Error importing clients:", err);
  process.exit(1);
});
