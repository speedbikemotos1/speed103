import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../server/db";
import { sales } from "../shared/schema";
import { eq, and, or, isNull } from "drizzle-orm";

// Parse a numeric value (handles commas as decimal separators)
function parseNumeric(value: string | undefined): number {
  if (!value || value.trim() === "" || value === "0") {
    return 0;
  }
  
  // Remove quotes if present
  const cleaned = value.replace(/['"]+/g, '');
  
  // Replace comma with dot for decimal parsing
  const normalized = cleaned.replace(/,/g, ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

// Round to nearest integer
function roundTotal(value: number): number {
  return Math.round(value);
}

// Parse CSV rows handling quoted fields
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

async function importTotals() {
  // Try multiple possible paths for the Excel CSV file
  const possiblePaths = [
    join("C:", "Users", "Contact SSPC", "Downloads", "Bon_de_livraison_ALL_101_EXACT.xlsx - Bon_de_livraison.csv"),
    join(process.cwd(), "attached_assets", "Bon_de_livraison_ALL_101_EXACT.xlsx - Bon_de_livraison.csv"),
    join(process.cwd(), "Bon_de_livraison_ALL_101_EXACT.xlsx - Bon_de_livraison.csv"),
  ];
  
  let csvContent: string | null = null;
  let csvPath: string | null = null;
  
  for (const path of possiblePaths) {
    try {
      csvContent = readFileSync(path, "utf-8");
      csvPath = path;
      console.log(`✅ Found CSV file at: ${path}`);
      break;
    } catch (error: any) {
      // Try next path
      continue;
    }
  }
  
  if (!csvContent || !csvPath) {
    console.error("\n❌ Could not find CSV file. Tried the following paths:");
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log("\nPlease ensure the CSV file exists in one of these locations.");
    process.exit(1);
  }
  
  const rows = parseCSVRows(csvContent);
  
  if (rows.length === 0) {
    throw new Error("CSV file is empty");
  }
  
  // Find header row
  let headerRowIndex = -1;
  let invoiceColIndex = -1;
  let totalColIndex = -1;
  
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const rowText = row.join(",").toLowerCase();
    
    if (rowText.includes("facture") && rowText.includes("montant")) {
      headerRowIndex = i;
      // Find column indices
      for (let j = 0; j < row.length; j++) {
        const col = row[j]?.toLowerCase() || "";
        if (col.includes("facture") && col.includes("n°")) {
          invoiceColIndex = j;
        }
        if (col.includes("montant") && col.includes("ttc")) {
          totalColIndex = j;
        }
      }
      break;
    }
  }
  
  if (headerRowIndex === -1 || invoiceColIndex === -1 || totalColIndex === -1) {
    throw new Error("Could not find required columns in CSV header");
  }
  
  console.log(`Found header at row ${headerRowIndex + 1}`);
  console.log(`Invoice column index: ${invoiceColIndex + 1} (${rows[headerRowIndex][invoiceColIndex]})`);
  console.log(`Total column index: ${totalColIndex + 1} (${rows[headerRowIndex][totalColIndex]})`);
  
  // Parse data rows
  const totalsMap = new Map<string, number>();
  let parsedCount = 0;
  let skippedCount = 0;
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (row.length === 0 || row.every(col => !col || col.trim() === "")) {
      continue;
    }
    
    if (row.length <= Math.max(invoiceColIndex, totalColIndex)) {
      skippedCount++;
      continue;
    }
    
    const invoiceNumber = row[invoiceColIndex]?.trim();
    const totalStr = row[totalColIndex]?.trim();
    
    if (!invoiceNumber || !totalStr) {
      skippedCount++;
      continue;
    }
    
    const total = parseNumeric(totalStr);
    if (total > 0) {
      totalsMap.set(invoiceNumber, roundTotal(total));
      parsedCount++;
    }
  }
  
  console.log(`\nParsed ${parsedCount} invoice totals from CSV`);
  console.log(`Skipped ${skippedCount} invalid rows`);
  
  // Update database
  console.log("\nUpdating database...");
  let updatedCount = 0;
  let skippedExistingCount = 0;
  let notFoundCount = 0;
  
  for (const [invoiceNumber, total] of totalsMap.entries()) {
    // Find the sale by invoice number
    const existingSales = await db
      .select()
      .from(sales)
      .where(eq(sales.invoiceNumber, invoiceNumber))
      .limit(1);
    
    if (existingSales.length === 0) {
      notFoundCount++;
      console.log(`  ⚠️  Invoice ${invoiceNumber} not found in database`);
      continue;
    }
    
    const sale = existingSales[0];
    
    // Only update if totalToPay is 0 or null
    if (sale.totalToPay && sale.totalToPay > 0) {
      skippedExistingCount++;
      console.log(`  ⏭️  Skipping ${invoiceNumber} - already has total: ${sale.totalToPay}`);
      continue;
    }
    
    // Update the sale
    await db
      .update(sales)
      .set({ totalToPay: total })
      .where(eq(sales.invoiceNumber, invoiceNumber));
    
    updatedCount++;
    console.log(`  ✅ Updated ${invoiceNumber}: ${total}`);
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("Import Summary:");
  console.log(`  ✅ Updated: ${updatedCount} records`);
  console.log(`  ⏭️  Skipped (already have total): ${skippedExistingCount} records`);
  console.log(`  ⚠️  Not found in database: ${notFoundCount} records`);
  console.log("=".repeat(50));
}

// Run the import
importTotals().catch((error) => {
  console.error("Error importing totals:", error);
  process.exit(1);
});
