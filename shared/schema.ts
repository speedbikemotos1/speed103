
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Helper to define the month keys for the payment schedule
// July 2025 to Jan 2028
export const PAYMENT_MONTHS = [
  "juillet_2025", "aout_2025", "septembre_2025", "octobre_2025", "novembre_2025", "decembre_2025",
  "janvier_2026", "fevrier_2026", "mars_2026", "avril_2026", "mai_2026", "juin_2026",
  "juillet_2026", "aout_2026", "septembre_2026", "octobre_2026", "novembre_2026", "decembre_2026",
  "janvier_2027", "fevrier_2027", "mars_2027", "avril_2027", "mai_2027", "juin_2027",
  "juillet_2027", "aout_2027", "septembre_2027", "octobre_2027", "novembre_2027", "decembre_2027",
  "janvier_2028"
] as const;

export const CARTE_GRISE_STATUS = [
  "A Déposer",  // Red
  "Récupérée",  // Green
  "Impôt",      // Orange
  "En cours",   // Purple
  "Prête",      // Blue
  "None",       // Light grey / no status
] as const;

// Structure for a single month's payment data
const PaymentDataSchema = z.object({
  amount: z.number().default(0),
  isPaid: z.boolean().default(false)
});

export type PaymentData = z.infer<typeof PaymentDataSchema>;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  role: text("role").notNull(), // 'manager' or 'staff'
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull(), // Keeping as text to match CSV 'DD/MM/YYYY' format flexibility, or could parse to date
  designation: text("designation").notNull(),
  clientType: text("client_type").notNull(), // B2B / B2C / Convention
  clientName: text("client_name").notNull(),
  conventionName: text("convention_name"), // e.g., "convention steg" or other convention names
  chassisNumber: text("chassis_number"),
  registrationNumber: text("registration_number"),
  grayCardStatus: text("gray_card_status").default("En cours"), // one of CARTE_GRISE_STATUS
  
  // Financials
  totalToPay: integer("total_to_pay").default(0), // Using integer for cents or whole numbers? CSV has commas. Numeric is safer.
  advance: integer("advance").default(0),
  
  // Payments: Stored as JSONB
  // Structure: { "juillet_2025": { amount: 100, isPaid: false }, ... }
  payments: text("payments", { mode: "json" }).$type<Record<string, PaymentData>>().default({}),
  paymentDay: integer("payment_day").default(1),

  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertSaleSchema = createInsertSchema(sales).omit({ 
  id: true, 
  createdAt: true 
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE'
  target: text("target").notNull(), // e.g. "Facture 25/000001"
  details: text("details"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const userNotifications = sqliteTable("user_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  notificationId: integer("notification_id").notNull().references(() => notifications.id),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  timestamp: true 
});

export type Notification = typeof notifications.$inferSelect & { isRead?: boolean };
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserNotification = typeof userNotifications.$inferSelect;

// Derived Types for API
export type SaleResponse = Sale;

// -----------------------------
// Modules: Oil (stock + sales)
// -----------------------------

export const oilSales = sqliteTable("oil_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  huile10w40: integer("huile_10w40").default(0).notNull(),
  huile20w50: integer("huile_20w50").default(0).notNull(),
  prix: real("prix").default(0).notNull(),
  encaissement: text("encaissement").notNull(),
  client: text("client").default("").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertOilSaleSchema = createInsertSchema(oilSales).omit({
  id: true,
  createdAt: true,
});

export type OilSale = typeof oilSales.$inferSelect;
export type InsertOilSale = z.infer<typeof insertOilSaleSchema>;

export const oilPurchases = sqliteTable("oil_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  huile10w40: integer("huile_10w40").default(0).notNull(),
  huile20w50: integer("huile_20w50").default(0).notNull(),
  fournisseur: text("fournisseur").default("").notNull(),
  prix: real("prix").default(0).notNull(), // total purchase cost (optional usage)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertOilPurchaseSchema = createInsertSchema(oilPurchases).omit({
  id: true,
  createdAt: true,
});

export type OilPurchase = typeof oilPurchases.$inferSelect;
export type InsertOilPurchase = z.infer<typeof insertOilPurchaseSchema>;

export const oilStockSchema = z.object({
  huile_10w40: z.number(),
  huile_20w50: z.number(),
});
export type OilStock = z.infer<typeof oilStockSchema>;

// -----------------------------
// Modules: Helmets (stock + sales)
// -----------------------------

export const helmetSales = sqliteTable("helmet_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numeroFacture: text("numero_facture").default("").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  designation: text("designation").notNull(),
  typeClient: text("type_client").notNull(),
  nomPrenom: text("nom_prenom").notNull(),
  quantite: integer("quantite").default(1).notNull(),
  montant: real("montant").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertHelmetSaleSchema = createInsertSchema(helmetSales).omit({
  id: true,
  createdAt: true,
});

export type HelmetSale = typeof helmetSales.$inferSelect;
export type InsertHelmetSale = z.infer<typeof insertHelmetSaleSchema>;

export const helmetPurchases = sqliteTable("helmet_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  designation: text("designation").notNull(),
  quantite: integer("quantite").default(0).notNull(),
  fournisseur: text("fournisseur").default("").notNull(),
  prix: real("prix").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertHelmetPurchaseSchema = createInsertSchema(helmetPurchases).omit({
  id: true,
  createdAt: true,
});

export type HelmetPurchase = typeof helmetPurchases.$inferSelect;
export type InsertHelmetPurchase = z.infer<typeof insertHelmetPurchaseSchema>;

export const helmetStockRowSchema = z.object({
  designation: z.string(),
  stock: z.number(),
});
export const helmetStockSchema = z.array(helmetStockRowSchema);
export type HelmetStockRow = z.infer<typeof helmetStockRowSchema>;

// -----------------------------
// Modules: Cache Selle (saddle stock + sales)
// -----------------------------

export const saddleSales = sqliteTable("saddle_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  tailleXl: integer("taille_xl").default(0).notNull(),
  tailleXxl: integer("taille_xxl").default(0).notNull(),
  prix: real("prix").default(0).notNull(),
  encaissement: text("encaissement").notNull(),
  client: text("client").default("").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertSaddleSaleSchema = createInsertSchema(saddleSales).omit({
  id: true,
  createdAt: true,
});

export type SaddleSale = typeof saddleSales.$inferSelect;
export type InsertSaddleSale = z.infer<typeof insertSaddleSaleSchema>;

export const saddlePurchases = sqliteTable("saddle_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  tailleXl: integer("taille_xl").default(0).notNull(),
  tailleXxl: integer("taille_xxl").default(0).notNull(),
  fournisseur: text("fournisseur").default("").notNull(),
  prix: real("prix").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertSaddlePurchaseSchema = createInsertSchema(saddlePurchases).omit({
  id: true,
  createdAt: true,
});

export type SaddlePurchase = typeof saddlePurchases.$inferSelect;
export type InsertSaddlePurchase = z.infer<typeof insertSaddlePurchaseSchema>;

export const saddleStockSchema = z.object({
  taille_xl: z.number(),
  taille_xxl: z.number(),
});
export type SaddleStock = z.infer<typeof saddleStockSchema>;

// -----------------------------
// Modules: Deferred / Divers sales (with stock)
// -----------------------------

export const deferredSales = sqliteTable("deferred_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  nomPrenom: text("nom_prenom").notNull(),
  numeroTelephone: text("numero_telephone").default("").notNull(),
  typeMoto: text("type_moto").default("").notNull(),
  designation: text("designation").notNull(),
  quantite: integer("quantite").default(1).notNull(),
  montant: real("montant").default(0).notNull(),
  isSettled: integer("is_settled", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const diversPurchases = sqliteTable("divers_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  designation: text("designation").notNull(),
  quantite: integer("quantite").default(0).notNull(),
  fournisseur: text("fournisseur").default("").notNull(),
  prix: real("prix").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertDiversPurchaseSchema = createInsertSchema(diversPurchases).omit({
  id: true,
  createdAt: true,
});

export type DiversPurchase = typeof diversPurchases.$inferSelect;
export type InsertDiversPurchase = z.infer<typeof insertDiversPurchaseSchema>;

export const diversStockRowSchema = z.object({
  designation: z.string(),
  stock: z.number(),
});
export const diversStockSchema = z.array(diversStockRowSchema);
export type DiversStockRow = z.infer<typeof diversStockRowSchema>;

export const insertDeferredSaleSchema = createInsertSchema(deferredSales).omit({
  id: true,
  createdAt: true,
});

export type DeferredSale = typeof deferredSales.$inferSelect;
export type InsertDeferredSale = z.infer<typeof insertDeferredSaleSchema>;

// -----------------------------
// Clients
// -----------------------------

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nomPrenom: text("nom_prenom").notNull(),
  numeroTelephone: text("numero_telephone").default("").notNull(),
  remarque: text("remarque").default("").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
