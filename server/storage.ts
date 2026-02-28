
import { db } from "./db";
import {
  sales,
  users,
  type InsertSale,
  type SaleResponse,
  type User,
  type InsertUser,
  type Notification,
  type InsertNotification,
  userNotifications,
  oilSales,
  oilPurchases,
  type InsertOilSale,
  type InsertOilPurchase,
  type OilSale,
  type OilPurchase,
  helmetSales,
  helmetPurchases,
  type InsertHelmetSale,
  type InsertHelmetPurchase,
  type HelmetSale,
  type HelmetPurchase,
  saddleSales,
  saddlePurchases,
  type InsertSaddleSale,
  type InsertSaddlePurchase,
  type SaddleSale,
  type SaddlePurchase,
  deferredSales,
  type InsertDeferredSale,
  type DeferredSale,
  diversPurchases,
  type InsertDiversPurchase,
  type DiversPurchase,
  clients,
  type InsertClient,
  type Client,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { notifications } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getSales(): Promise<SaleResponse[]>;
  getSale(id: number): Promise<SaleResponse | undefined>;
  createSale(sale: InsertSale): Promise<SaleResponse>;
  updateSale(id: number, updates: Partial<InsertSale>): Promise<SaleResponse>;
  deleteSale(id: number): Promise<void>;
  bulkCreateSales(salesData: InsertSale[]): Promise<SaleResponse[]>;
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notif: InsertNotification): Promise<Notification>;
  markNotificationsAsRead(userId: number): Promise<void>;
  clearNotifications(userId: number): Promise<void>;

  // Oil module
  getOilSales(): Promise<OilSale[]>;
  createOilSale(sale: InsertOilSale): Promise<OilSale>;
  seedOilSales(rows: InsertOilSale[]): Promise<void>;
  updateOilSale(id: number, updates: Partial<InsertOilSale>): Promise<OilSale>;
  deleteOilSale(id: number): Promise<void>;
  getOilPurchases(): Promise<OilPurchase[]>;
  createOilPurchase(p: InsertOilPurchase): Promise<OilPurchase>;
  deleteOilPurchase(id: number): Promise<void>;
  getOilStock(): Promise<{ huile_10w40: number; huile_20w50: number }>;

  // Helmets module
  getHelmetSales(): Promise<HelmetSale[]>;
  createHelmetSale(sale: InsertHelmetSale): Promise<HelmetSale>;
  seedHelmetSales(rows: InsertHelmetSale[]): Promise<void>;
  updateHelmetSale(id: number, updates: Partial<InsertHelmetSale>): Promise<HelmetSale>;
  deleteHelmetSale(id: number): Promise<void>;
  getHelmetPurchases(): Promise<HelmetPurchase[]>;
  createHelmetPurchase(p: InsertHelmetPurchase): Promise<HelmetPurchase>;
  deleteHelmetPurchase(id: number): Promise<void>;
  getHelmetStock(): Promise<Array<{ designation: string; stock: number }>>;

  // Saddles (Cache Selle)
  getSaddleSales(): Promise<SaddleSale[]>;
  createSaddleSale(sale: InsertSaddleSale): Promise<SaddleSale>;
  seedSaddleSales(rows: InsertSaddleSale[]): Promise<void>;
  updateSaddleSale(id: number, updates: Partial<InsertSaddleSale>): Promise<SaddleSale>;
  deleteSaddleSale(id: number): Promise<void>;
  getSaddlePurchases(): Promise<SaddlePurchase[]>;
  createSaddlePurchase(p: InsertSaddlePurchase): Promise<SaddlePurchase>;
  deleteSaddlePurchase(id: number): Promise<void>;
  getSaddleStock(): Promise<{ taille_xl: number; taille_xxl: number }>;

  // Deferred / Divers sales
  getDeferredSales(): Promise<DeferredSale[]>;
  createDeferredSale(sale: InsertDeferredSale): Promise<DeferredSale>;
  updateDeferredSale(id: number, updates: Partial<InsertDeferredSale>): Promise<DeferredSale>;
  deleteDeferredSale(id: number): Promise<void>;
  getDiversPurchases(): Promise<DiversPurchase[]>;
  createDiversPurchase(p: InsertDiversPurchase): Promise<DiversPurchase>;
  deleteDiversPurchase(id: number): Promise<void>;
  getDiversStock(): Promise<Array<{ designation: string; stock: number }>>;

  // Clients
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private getOilStockWithExecutor(
    executor: typeof db | any,
  ): { huile_10w40: number; huile_20w50: number } {
    const purchaseRows = executor
      .select({
        q10: sql<number>`coalesce(sum(${oilPurchases.huile10w40}), 0)`,
        q20: sql<number>`coalesce(sum(${oilPurchases.huile20w50}), 0)`,
      })
      .from(oilPurchases)
      .all?.() ?? executor
      .select({
        q10: sql<number>`coalesce(sum(${oilPurchases.huile10w40}), 0)`,
        q20: sql<number>`coalesce(sum(${oilPurchases.huile20w50}), 0)`,
      })
      .from(oilPurchases);

    const salesRows = executor
      .select({
        q10: sql<number>`coalesce(sum(${oilSales.huile10w40}), 0)`,
        q20: sql<number>`coalesce(sum(${oilSales.huile20w50}), 0)`,
      })
      .from(oilSales)
      .all?.() ?? executor
      .select({
        q10: sql<number>`coalesce(sum(${oilSales.huile10w40}), 0)`,
        q20: sql<number>`coalesce(sum(${oilSales.huile20w50}), 0)`,
      })
      .from(oilSales);

    const p = Array.isArray(purchaseRows) ? purchaseRows[0] : purchaseRows;
    const s = Array.isArray(salesRows) ? salesRows[0] : salesRows;

    return {
      huile_10w40: Number(p?.q10 ?? 0) - Number(s?.q10 ?? 0),
      huile_20w50: Number(p?.q20 ?? 0) - Number(s?.q20 ?? 0),
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getSales(): Promise<SaleResponse[]> {
    return await db
      .select()
      .from(sales)
      .orderBy(
        desc(sql<number>`CAST(substr(${sales.invoiceNumber}, 1, 2) AS INTEGER)`),
        desc(sql<number>`CAST(substr(${sales.invoiceNumber}, instr(${sales.invoiceNumber}, '/') + 1) AS INTEGER)`),
      );
  }

  async getSale(id: number): Promise<SaleResponse | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }

  async getSaleByInvoiceNumber(invoiceNumber: string): Promise<SaleResponse | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.invoiceNumber, invoiceNumber));
    return sale;
  }

  async createSale(sale: InsertSale): Promise<SaleResponse> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async updateSale(id: number, updates: Partial<InsertSale>): Promise<SaleResponse> {
    const [updatedSale] = await db
      .update(sales)
      .set(updates)
      .where(eq(sales.id, id))
      .returning();
    return updatedSale;
  }

  async deleteSale(id: number): Promise<void> {
    await db.delete(sales).where(eq(sales.id, id));
  }

  async bulkCreateSales(salesData: InsertSale[]): Promise<SaleResponse[]> {
    if (salesData.length === 0) return [];
    return await db.insert(sales).values(salesData).returning();
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    const results = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        action: notifications.action,
        target: notifications.target,
        details: notifications.details,
        timestamp: notifications.timestamp,
        isRead: userNotifications.isRead,
      })
      .from(notifications)
      .leftJoin(userNotifications, and(eq(userNotifications.notificationId, notifications.id), eq(userNotifications.userId, userId)))
      .orderBy(desc(notifications.timestamp))
      .limit(20);
    
    return results.map(r => ({ ...r, isRead: r.isRead ?? false }));
  }

  async createNotification(notif: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notif).returning();
    return { ...newNotif, isRead: false };
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    const allNotifs = await db.select({ id: notifications.id }).from(notifications);
    for (const notif of allNotifs) {
      const [existing] = await db
        .select()
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.notificationId, notif.id),
            eq(userNotifications.userId, userId)
          )
        );
      if (existing) {
        await db
          .update(userNotifications)
          .set({ isRead: true })
          .where(eq(userNotifications.id, existing.id));
      } else {
        await db
          .insert(userNotifications)
          .values({ userId, notificationId: notif.id, isRead: true });
      }
    }
  }

  async clearNotifications(userId: number): Promise<void> {
    await db.delete(userNotifications).where(eq(userNotifications.userId, userId));
  }

  // -----------------
  // Oil
  // -----------------

  async getOilSales(): Promise<OilSale[]> {
    return await db.select().from(oilSales).orderBy(desc(oilSales.date), desc(oilSales.createdAt));
  }

  async getOilPurchases(): Promise<OilPurchase[]> {
    return await db.select().from(oilPurchases).orderBy(desc(oilPurchases.date), desc(oilPurchases.createdAt));
  }

  async getOilStock(): Promise<{ huile_10w40: number; huile_20w50: number }> {
    return this.getOilStockWithExecutor(db);
  }

  async createOilPurchase(p: InsertOilPurchase): Promise<OilPurchase> {
    const [row] = await db.insert(oilPurchases).values(p).returning();
    return row;
  }

  async deleteOilPurchase(id: number): Promise<void> {
    await db.delete(oilPurchases).where(eq(oilPurchases.id, id));
  }

  async createOilSale(sale: InsertOilSale): Promise<OilSale> {
    // Simple stock check (no DB transaction to avoid better-sqlite3 async issues)
    const stock = this.getOilStockWithExecutor(db);
    const q10 = Number(sale.huile10w40 ?? 0);
    const q20 = Number(sale.huile20w50 ?? 0);
    if (q10 > stock.huile_10w40 || q20 > stock.huile_20w50) {
      const err: any = new Error("Stock insuffisant");
      err.status = 400;
      throw err;
    }
    const inserted = await db.insert(oilSales).values(sale).returning();
    return Array.isArray(inserted) ? (inserted[0] as OilSale) : (inserted as unknown as OilSale);
  }

  async seedOilSales(rows: InsertOilSale[]): Promise<void> {
    if (!rows.length) return;
    await db.insert(oilSales).values(rows);
  }

  async updateOilSale(id: number, updates: Partial<InsertOilSale>): Promise<OilSale> {
    const [row] = await db.update(oilSales).set(updates).where(eq(oilSales.id, id)).returning();
    if (!row) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return row;
  }

  async deleteOilSale(id: number): Promise<void> {
    await db.delete(oilSales).where(eq(oilSales.id, id));
  }

  // -----------------
  // Helmets
  // -----------------

  async getHelmetSales(): Promise<HelmetSale[]> {
    return await db.select().from(helmetSales).orderBy(desc(helmetSales.date), desc(helmetSales.createdAt));
  }

  async getHelmetPurchases(): Promise<HelmetPurchase[]> {
    return await db.select().from(helmetPurchases).orderBy(desc(helmetPurchases.date), desc(helmetPurchases.createdAt));
  }

  async getHelmetStock(): Promise<Array<{ designation: string; stock: number }>> {
    const purchases = await db
      .select({
        designation: helmetPurchases.designation,
        qty: sql<number>`coalesce(sum(${helmetPurchases.quantite}), 0)`,
      })
      .from(helmetPurchases)
      .groupBy(helmetPurchases.designation);

    const salesAgg = await db
      .select({
        designation: helmetSales.designation,
        qty: sql<number>`coalesce(sum(${helmetSales.quantite}), 0)`,
      })
      .from(helmetSales)
      .groupBy(helmetSales.designation);

    const pMap = new Map<string, number>();
    for (const p of purchases) pMap.set(p.designation, Number(p.qty ?? 0));

    const sMap = new Map<string, number>();
    for (const s of salesAgg) sMap.set(s.designation, Number(s.qty ?? 0));

    const allDesignations = new Set<string>([...Array.from(pMap.keys()), ...Array.from(sMap.keys())]);
    const rows = Array.from(allDesignations).map((designation) => ({
      designation,
      stock: (pMap.get(designation) ?? 0) - (sMap.get(designation) ?? 0),
    }));

    rows.sort((a, b) => a.designation.localeCompare(b.designation));
    return rows;
  }

  async createHelmetPurchase(p: InsertHelmetPurchase): Promise<HelmetPurchase> {
    const [row] = await db.insert(helmetPurchases).values(p).returning();
    return row;
  }

  async deleteHelmetPurchase(id: number): Promise<void> {
    await db.delete(helmetPurchases).where(eq(helmetPurchases.id, id));
  }

  private getHelmetStockForDesignation(executor: typeof db | any, designation: string): number {
    const purchaseRows = executor
      .select({ qty: sql<number>`coalesce(sum(${helmetPurchases.quantite}), 0)` })
      .from(helmetPurchases)
      .where(eq(helmetPurchases.designation, designation))
      .all?.() ?? executor
      .select({ qty: sql<number>`coalesce(sum(${helmetPurchases.quantite}), 0)` })
      .from(helmetPurchases)
      .where(eq(helmetPurchases.designation, designation));

    const salesRows = executor
      .select({ qty: sql<number>`coalesce(sum(${helmetSales.quantite}), 0)` })
      .from(helmetSales)
      .where(eq(helmetSales.designation, designation))
      .all?.() ?? executor
      .select({ qty: sql<number>`coalesce(sum(${helmetSales.quantite}), 0)` })
      .from(helmetSales)
      .where(eq(helmetSales.designation, designation));

    const p = Array.isArray(purchaseRows) ? purchaseRows[0] : purchaseRows;
    const s = Array.isArray(salesRows) ? salesRows[0] : salesRows;

    return Number(p?.qty ?? 0) - Number(s?.qty ?? 0);
  }

  async createHelmetSale(sale: InsertHelmetSale): Promise<HelmetSale> {
    const current = this.getHelmetStockForDesignation(db, sale.designation);
    const qty = Number(sale.quantite ?? 1);
    if (qty > current) {
      const err: any = new Error("Stock insuffisant");
      err.status = 400;
      throw err;
    }
    const inserted = await db.insert(helmetSales).values(sale).returning();
    return Array.isArray(inserted) ? (inserted[0] as HelmetSale) : (inserted as unknown as HelmetSale);
  }

  async seedHelmetSales(rows: InsertHelmetSale[]): Promise<void> {
    if (!rows.length) return;
    await db.insert(helmetSales).values(rows);
  }

  async updateHelmetSale(id: number, updates: Partial<InsertHelmetSale>): Promise<HelmetSale> {
    const [row] = await db.update(helmetSales).set(updates).where(eq(helmetSales.id, id)).returning();
    if (!row) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return row;
  }

  async deleteHelmetSale(id: number): Promise<void> {
    await db.delete(helmetSales).where(eq(helmetSales.id, id));
  }

  // -----------------
  // Saddles (Cache Selle)
  // -----------------

  private getSaddleStockWithExecutor(executor: typeof db | any): { taille_xl: number; taille_xxl: number } {
    const purchaseRows = executor
      .select({
        qxl: sql<number>`coalesce(sum(${saddlePurchases.tailleXl}), 0)`,
        qxxl: sql<number>`coalesce(sum(${saddlePurchases.tailleXxl}), 0)`,
      })
      .from(saddlePurchases)
      .all?.() ?? executor
      .select({
        qxl: sql<number>`coalesce(sum(${saddlePurchases.tailleXl}), 0)`,
        qxxl: sql<number>`coalesce(sum(${saddlePurchases.tailleXxl}), 0)`,
      })
      .from(saddlePurchases);

    const salesRows = executor
      .select({
        qxl: sql<number>`coalesce(sum(${saddleSales.tailleXl}), 0)`,
        qxxl: sql<number>`coalesce(sum(${saddleSales.tailleXxl}), 0)`,
      })
      .from(saddleSales)
      .all?.() ?? executor
      .select({
        qxl: sql<number>`coalesce(sum(${saddleSales.tailleXl}), 0)`,
        qxxl: sql<number>`coalesce(sum(${saddleSales.tailleXxl}), 0)`,
      })
      .from(saddleSales);

    const p = Array.isArray(purchaseRows) ? purchaseRows[0] : purchaseRows;
    const s = Array.isArray(salesRows) ? salesRows[0] : salesRows;

    return {
      taille_xl: Number(p?.qxl ?? 0) - Number(s?.qxl ?? 0),
      taille_xxl: Number(p?.qxxl ?? 0) - Number(s?.qxxl ?? 0),
    };
  }

  async getSaddleSales(): Promise<SaddleSale[]> {
    return await db.select().from(saddleSales).orderBy(desc(saddleSales.date), desc(saddleSales.createdAt));
  }

  async getSaddlePurchases(): Promise<SaddlePurchase[]> {
    return await db.select().from(saddlePurchases).orderBy(desc(saddlePurchases.date), desc(saddlePurchases.createdAt));
  }

  async getSaddleStock(): Promise<{ taille_xl: number; taille_xxl: number }> {
    return this.getSaddleStockWithExecutor(db);
  }

  async createSaddlePurchase(p: InsertSaddlePurchase): Promise<SaddlePurchase> {
    const [row] = await db.insert(saddlePurchases).values(p).returning();
    return row;
  }

  async deleteSaddlePurchase(id: number): Promise<void> {
    await db.delete(saddlePurchases).where(eq(saddlePurchases.id, id));
  }

  async createSaddleSale(sale: InsertSaddleSale): Promise<SaddleSale> {
    const stock = this.getSaddleStockWithExecutor(db);
    const qxl = Number(sale.tailleXl ?? 0);
    const qxxl = Number(sale.tailleXxl ?? 0);
    if (qxl > stock.taille_xl || qxxl > stock.taille_xxl) {
      const err: any = new Error("Stock insuffisant");
      err.status = 400;
      throw err;
    }
    const inserted = await db.insert(saddleSales).values(sale).returning();
    return Array.isArray(inserted) ? (inserted[0] as SaddleSale) : (inserted as unknown as SaddleSale);
  }

  async seedSaddleSales(rows: InsertSaddleSale[]): Promise<void> {
    if (!rows.length) return;
    await db.insert(saddleSales).values(rows);
  }

  async updateSaddleSale(id: number, updates: Partial<InsertSaddleSale>): Promise<SaddleSale> {
    const [row] = await db.update(saddleSales).set(updates).where(eq(saddleSales.id, id)).returning();
    if (!row) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return row;
  }

  async deleteSaddleSale(id: number): Promise<void> {
    await db.delete(saddleSales).where(eq(saddleSales.id, id));
  }

  // -----------------
  // Deferred / Divers
  // -----------------

  async getDeferredSales(): Promise<DeferredSale[]> {
    return await db.select().from(deferredSales).orderBy(desc(deferredSales.date), desc(deferredSales.createdAt));
  }

  private getDiversStockForDesignation(executor: typeof db | any, designation: string): number {
    const purchaseRows = executor
      .select({ qty: sql<number>`coalesce(sum(${diversPurchases.quantite}), 0)` })
      .from(diversPurchases)
      .where(eq(diversPurchases.designation, designation))
      .all?.() ?? executor
      .select({ qty: sql<number>`coalesce(sum(${diversPurchases.quantite}), 0)` })
      .from(diversPurchases)
      .where(eq(diversPurchases.designation, designation));

    const salesRows = executor
      .select({ qty: sql<number>`coalesce(sum(${deferredSales.quantite}), 0)` })
      .from(deferredSales)
      .where(eq(deferredSales.designation, designation))
      .all?.() ?? executor
      .select({ qty: sql<number>`coalesce(sum(${deferredSales.quantite}), 0)` })
      .from(deferredSales)
      .where(eq(deferredSales.designation, designation));

    const p = Array.isArray(purchaseRows) ? purchaseRows[0] : purchaseRows;
    const s = Array.isArray(salesRows) ? salesRows[0] : salesRows;

    return Number(p?.qty ?? 0) - Number(s?.qty ?? 0);
  }

  async getDiversStock(): Promise<Array<{ designation: string; stock: number }>> {
    const purchases = await db
      .select({
        designation: diversPurchases.designation,
        qty: sql<number>`coalesce(sum(${diversPurchases.quantite}), 0)`,
      })
      .from(diversPurchases)
      .groupBy(diversPurchases.designation);

    const salesAgg = await db
      .select({
        designation: deferredSales.designation,
        qty: sql<number>`coalesce(sum(${deferredSales.quantite}), 0)`,
      })
      .from(deferredSales)
      .groupBy(deferredSales.designation);

    const pMap = new Map<string, number>();
    for (const p of purchases) pMap.set(p.designation, Number(p.qty ?? 0));

    const sMap = new Map<string, number>();
    for (const s of salesAgg) sMap.set(s.designation, Number(s.qty ?? 0));

    const allDesignations = new Set<string>([...Array.from(pMap.keys()), ...Array.from(sMap.keys())]);
    const rows = Array.from(allDesignations).map((designation) => ({
      designation,
      stock: (pMap.get(designation) ?? 0) - (sMap.get(designation) ?? 0),
    }));

    rows.sort((a, b) => a.designation.localeCompare(b.designation));
    return rows;
  }

  async getDiversPurchases(): Promise<DiversPurchase[]> {
    return await db.select().from(diversPurchases).orderBy(desc(diversPurchases.date), desc(diversPurchases.createdAt));
  }

  async createDiversPurchase(p: InsertDiversPurchase): Promise<DiversPurchase> {
    const [row] = await db.insert(diversPurchases).values(p).returning();
    return row;
  }

  async deleteDiversPurchase(id: number): Promise<void> {
    await db.delete(diversPurchases).where(eq(diversPurchases.id, id));
  }

  async createDeferredSale(sale: InsertDeferredSale): Promise<DeferredSale> {
    const qty = Number(sale.quantite ?? 1);
    if (qty > 0) {
      const stock = this.getDiversStockForDesignation(db, sale.designation);
      if (qty > stock) {
        const err: any = new Error("Stock insuffisant");
        err.status = 400;
        throw err;
      }
    }
    const values = { ...sale, quantite: sale.quantite ?? 1 };
    const inserted = await db.insert(deferredSales).values(values).returning();
    return Array.isArray(inserted) ? (inserted[0] as DeferredSale) : (inserted as unknown as DeferredSale);
  }

  async updateDeferredSale(id: number, updates: Partial<InsertDeferredSale>): Promise<DeferredSale> {
    const [row] = await db.update(deferredSales).set(updates).where(eq(deferredSales.id, id)).returning();
    if (!row) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return row;
  }

  async deleteDeferredSale(id: number): Promise<void> {
    await db.delete(deferredSales).where(eq(deferredSales.id, id));
  }

  // -----------------
  // Clients
  // -----------------

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [row] = await db.insert(clients).values(client).returning();
    return row;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client> {
    const [row] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    if (!row) {
      const err: any = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return row;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }
}

export const storage = new DatabaseStorage();
