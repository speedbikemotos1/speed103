import { db } from "../server/db";
import { clients } from "../shared/schema";
import { eq } from "drizzle-orm";

const MISSED_CLIENT = {
  nomPrenom: "STE LE CLUB",
  numeroTelephone: "24356699",
  remarque: "Company, PME/PMI, CLIENT B2B, S.A.R.L - 081 FARHAT HACHED TUNIS 1001 - Matricule: 1600961Q",
};

async function addMissedClient() {
  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.nomPrenom, "STE LE CLUB"));

  if (existing.length > 0) {
    console.log("ℹ️ STE LE CLUB already exists, skipping.");
    return;
  }

  await db.insert(clients).values(MISSED_CLIENT);
  console.log("✅ Added missed client: STE LE CLUB");
}

addMissedClient().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
