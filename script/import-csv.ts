import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../server/db";
import { sales, PAYMENT_MONTHS } from "../shared/schema";
import { eq } from "drizzle-orm";

// Month mapping from CSV row 6 to schema month keys
const CSV_MONTH_MAPPING: Record<string, string> = {
  "juillet 2025": "juillet_2025",
  "Aout 2025": "aout_2025",
  "septembre 2025": "septembre_2025",
  "octobre 2025": "octobre_2025",
  "novembre 2025": "novembre_2025",
  "Dècembre 2025": "decembre_2025",
  "janvier 2026": "janvier_2026",
  "Fevrier 2026": "fevrier_2026",
  "mars 2026": "mars_2026",
  "avril 2026": "avril_2026",
  "mai 2026": "mai_2026",
  "juin 2026": "juin_2026",
  "juillet 2026": "juillet_2026",
  "Aout 2026": "aout_2026",
  "septembre 2026": "septembre_2026",
  "octobre 2026": "octobre_2026",
  "novembre 2026": "novembre_2026",
  "Dècembre 2026": "decembre_2026",
  "janvier 2027": "janvier_2027",
};

// Status mapping from CSV to schema
const STATUS_MAPPING: Record<string, string> = {
  "RECUPEREE": "Récupérée",
  "IMPOT": "Impôt",
  "DEPOSEE": "A Déposer",
  "CARTE GRISE": "En cours",
};

// Parse a numeric value (handles commas as decimal separators)
function parseNumeric(value: string | undefined): number {
  if (!value || value.trim() === "" || value === "0") {
    return 0;
  }
  
  // Handle special cases like "1200+100"
  if (value.includes("+")) {
    const parts = value.split("+");
    return parts.reduce((sum, part) => sum + parseNumeric(part), 0);
  }
  
  // Replace comma with dot for decimal parsing
  const normalized = value.replace(/,/g, ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

// Convert date from DD/MM/YYYY to YYYY-MM-DD or keep as is
function normalizeDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") {
    return "";
  }
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Parse DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  return dateStr;
}

// Normalize status value
function normalizeStatus(status: string | undefined): string {
  if (!status || status.trim() === "") {
    return "En cours";
  }
  
  const upperStatus = status.toUpperCase().trim();
  return STATUS_MAPPING[upperStatus] || status;
}

// Normalize client type
function normalizeClientType(type: string | undefined): string {
  if (!type || type.trim() === "") {
    return "B2C";
  }
  return type.trim();
}

// Parse entire CSV content handling multiline quoted fields
function parseCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row separator (only if not in quotes)
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
    } else {
      currentField += char;
    }
  }
  
  // Add last field and row if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }
  
  return rows;
}

async function importCSV() {
  const csvPath = join(
    process.cwd(),
    "attached_assets",
    "SUIVI_CARTES_GRISES_-_Suivi_Cartes_Grises_(1)_1767947369188.csv"
  );
  
  console.log("Reading CSV file...");
  const csvContent = readFileSync(csvPath, "utf-8");
  const rows = parseCSVRows(csvContent);
  
  // Find header row and month header row
  let headerRowIndex = -1;
  let monthHeaderRowIndex = -1;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.join(",");
    if (rowText.includes("N° Facture") && rowText.includes("Date")) {
      headerRowIndex = i;
    }
    if (rowText.includes("AVANCE") && rowText.includes("juillet 2025")) {
      monthHeaderRowIndex = i;
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error("Could not find header row");
  }
  
  if (monthHeaderRowIndex === -1) {
    throw new Error("Could not find month header row");
  }
  
  // Parse month header row to get column mapping
  const monthColumns = rows[monthHeaderRowIndex];
  
  // Build month column index mapping
  const monthColumnMap: Record<number, string> = {};
  for (let i = 0; i < monthColumns.length; i++) {
    const monthName = monthColumns[i]?.trim();
    if (monthName && monthName !== "AVANCE" && CSV_MONTH_MAPPING[monthName]) {
      monthColumnMap[i] = CSV_MONTH_MAPPING[monthName];
    }
  }
  
  console.log("Month column mapping:", monthColumnMap);
  
  // Parse data rows (start from headerRowIndex + 1)
  const dataRows: any[] = [];
  let skippedRows = 0;
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const columns = rows[i];
    
    // Skip empty rows
    if (columns.length === 0 || columns.every(col => !col || col.trim() === "")) {
      continue;
    }
    
    // Skip if doesn't have minimum required columns
    if (columns.length < 8) {
      skippedRows++;
      continue;
    }
    
    const invoiceNumber = columns[0]?.trim();
    const date = columns[1]?.trim();
    
    // Skip if missing essential fields
    if (!invoiceNumber || !date) {
      skippedRows++;
      continue;
    }
    
    const designation = columns[2]?.trim() || "";
    const clientType = normalizeClientType(columns[3]);
    const clientName = columns[4]?.trim() || "";
    const chassisNumber = columns[5]?.trim() || "";
    const registrationNumber = columns[6]?.trim() || "";
    const grayCardStatus = normalizeStatus(columns[7]);
    const advance = parseNumeric(columns[8]); // Column 8 is AVANCE
    
    // Parse payment schedule (columns 9-28)
    const payments: Record<string, { amount: number; isPaid: boolean }> = {};
    
    for (let colIdx = 9; colIdx < columns.length && colIdx <= 28; colIdx++) {
      const monthKey = monthColumnMap[colIdx];
      if (monthKey) {
        const amount = parseNumeric(columns[colIdx]);
        if (amount > 0) {
          payments[monthKey] = {
            amount,
            isPaid: true, // If amount is present, assume it's paid
          };
        }
      }
    }
    
    // Calculate total to pay (sum of all payments + advance)
    // Amounts are already in dinars, no conversion needed
    const totalToPay = Object.values(payments).reduce(
      (sum, payment) => sum + payment.amount,
      advance
    );
    
    // Round amounts to nearest integer (already in dinars)
    const totalToPayRounded = Math.round(totalToPay);
    const advanceRounded = Math.round(advance);
    
    // Round payment amounts
    const paymentsRounded: Record<string, { amount: number; isPaid: boolean }> = {};
    for (const [month, payment] of Object.entries(payments)) {
      paymentsRounded[month] = {
        amount: Math.round(payment.amount),
        isPaid: payment.isPaid,
      };
    }
    
    dataRows.push({
      invoiceNumber,
      date: normalizeDate(date),
      designation,
      clientType,
      clientName,
      chassisNumber: chassisNumber || null,
      registrationNumber: registrationNumber || null,
      grayCardStatus,
      totalToPay: totalToPayRounded,
      advance: advanceRounded,
      payments: paymentsRounded, // Drizzle will handle JSON serialization
    });
  }
  
  console.log(`\nParsed ${dataRows.length} records`);
  console.log(`Skipped ${skippedRows} invalid rows`);
  
  // Check for duplicates and only add new records
  console.log("\nChecking for duplicates...");
  const newRows: any[] = [];
  let duplicates = 0;
  
  for (const row of dataRows) {
    const existing = await db
      .select()
      .from(sales)
      .where(eq(sales.invoiceNumber, row.invoiceNumber))
      .limit(1);
    
    if (existing.length === 0) {
      newRows.push(row);
    } else {
      duplicates++;
      console.log(`  Skipping duplicate: ${row.invoiceNumber}`);
    }
  }
  
  console.log(`\nFound ${duplicates} duplicates, ${newRows.length} new records to add`);
  
  // Insert only new rows in batches
  if (newRows.length > 0) {
    console.log("\nInserting new data into database...");
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < newRows.length; i += batchSize) {
      const batch = newRows.slice(i, i + batchSize);
      await db.insert(sales).values(batch);
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${newRows.length} records...`);
    }
    
    console.log(`\n✅ Successfully imported ${inserted} new records!`);
    console.log(`   (${duplicates} duplicates were skipped)`);
  } else {
    console.log("\n⚠️  No new records to import (all are duplicates)");
  }
}

// Run the import
importCSV().catch((error) => {
  console.error("Error importing CSV:", error);
  process.exit(1);
});
