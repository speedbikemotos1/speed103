
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
  gearOil: integer("gear_oil").default(0),
  brakeOil: integer("brake_oil").default(0),
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
  gearOil: integer("gear_oil").default(0),
  brakeOil: integer("brake_oil").default(0),
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
  gear_oil: z.number(),
  break_oil: z.number(),
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
  remarque: text("remarque").default("").notNull(),
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
// Inventory & Products
// -----------------------------

export const productFamilies = sqliteTable("product_families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull().unique(),
  designation: text("designation").notNull(),
  familyId: integer("family_id")
    .notNull()
    .references(() => productFamilies.id),
  purchasePrice: real("purchase_price").notNull().default(0),
  sellPrice: real("sell_price").notNull().default(0),
  tva: real("tva").notNull().default(19),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const purchaseReceipts = sqliteTable("purchase_receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bonNumber: text("bon_number").notNull().unique(),
  date: text("date").notNull(),
  supplier: text("supplier").notNull(),
  totalHt: real("total_ht").notNull().default(0),
  totalTva: real("total_tva").notNull().default(0),
  totalTtc: real("total_ttc").notNull().default(0),
  isValidated: integer("is_validated", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const purchaseItems = sqliteTable("purchase_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => purchaseReceipts.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  reference: text("reference").notNull(),
  designation: text("designation").notNull(),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  tva: real("tva").notNull().default(19),
  discount: real("discount").notNull().default(0),
});

export const insertProductFamilySchema = createInsertSchema(productFamilies).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertPurchaseReceiptSchema = createInsertSchema(purchaseReceipts).omit({ id: true, createdAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });

export type ProductFamily = typeof productFamilies.$inferSelect;
export type Product = typeof products.$inferSelect;
export type PurchaseReceipt = typeof purchaseReceipts.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

// -----------------------------
// Sales Module (Vente)
// -----------------------------

export const devis = sqliteTable("devis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  devisNumber: text("devis_number").notNull().unique(),
  date: text("date").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  commercial: text("commercial"),
  totalHt: real("total_ht").notNull().default(0),
  totalTva: real("total_tva").notNull().default(0),
  totalTtc: real("total_ttc").notNull().default(0),
  status: text("status").notNull().default("En attente"), // En attente, Converti, Annulé
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const devisLines = sqliteTable("devis_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  devisId: integer("devis_id")
    .notNull()
    .references(() => devis.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  reference: text("reference").notNull(),
  designation: text("designation").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  tva: real("tva").notNull().default(19),
  discount: real("discount").notNull().default(0),
});

export const bonLivraison = sqliteTable("bon_livraison", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blNumber: text("bl_number").notNull().unique(),
  date: text("date").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  commercial: text("commercial"),
  devisId: integer("devis_id").references(() => devis.id),
  factureId: integer("facture_id"), 
  totalHt: real("total_ht").notNull().default(0),
  totalTva: real("total_tva").notNull().default(0),
  totalTtc: real("total_ttc").notNull().default(0),
  exonereTva: integer("exonere_tva", { mode: "boolean" }).default(false),
  isValidated: integer("is_validated", { mode: "boolean" }).default(false),
  status: text("status").notNull().default("Brouillon"), // Brouillon, Validé, Facturé
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const blLines = sqliteTable("bl_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blId: integer("bl_id")
    .notNull()
    .references(() => bonLivraison.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  reference: text("reference").notNull(),
  designation: text("designation").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  tva: real("tva").notNull().default(19),
  discount: real("discount").notNull().default(0),
  serialNumber: text("serial_number"),
});

export const factures = sqliteTable("factures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factureNumber: text("facture_number").notNull().unique(),
  date: text("date").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  commercial: text("commercial"),
  blId: integer("bl_id")
    .notNull()
    .references(() => bonLivraison.id),
  totalHt: real("total_ht").notNull().default(0),
  fodec: real("fodec").notNull().default(0),
  totalTva: real("total_tva").notNull().default(0),
  timbreFiscal: real("timbre_fiscal").notNull().default(1),
  totalNet: real("total_net").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export const insertDevisSchema = createInsertSchema(devis).omit({ id: true, createdAt: true });
export const insertDevisLineSchema = createInsertSchema(devisLines).omit({ id: true });
export const insertBlSchema = createInsertSchema(bonLivraison).omit({ id: true, createdAt: true });
export const insertBlLineSchema = createInsertSchema(blLines).omit({ id: true });
export const insertFactureSchema = createInsertSchema(factures).omit({ id: true, createdAt: true });

export type Devis = typeof devis.$inferSelect;
export type DevisLine = typeof devisLines.$inferSelect;
export type BonLivraison = typeof bonLivraison.$inferSelect;
export type BlLine = typeof blLines.$inferSelect;
export type Facture = typeof factures.$inferSelect;

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uniqueNumber: integer("unique_number"),
  nomPrenom: text("nom_prenom").notNull(),
  numeroTelephone: text("numero_telephone").default("").notNull(),
  hasSubClient: integer("has_sub_client", { mode: "boolean" }).default(false),
  subClientName: text("sub_client_name"),
  subClientPhone: text("sub_client_phone"),
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
