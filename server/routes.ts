
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { PAYMENT_MONTHS, type InsertOilSale, type InsertHelmetSale, type InsertSaddleSale } from "@shared/schema";
import { setupAuth } from "./auth";
import { importCSVFromBuffer } from "./csv-import";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  
  // Middleware to protect routes
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Non autorisé" });
  };

  app.get(api.sales.list.path, isAuthenticated, async (req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.get("/api/sales/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    
    const sale = await storage.getSale(id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    const notifications = await storage.getNotifications((req.user as any).id);
    res.json(notifications);
  });

  app.post("/api/notifications/mark-read", isAuthenticated, async (req, res) => {
    await storage.markNotificationsAsRead((req.user as any).id);
    res.json({ success: true });
  });

  app.delete("/api/notifications", isAuthenticated, async (req, res) => {
    await storage.clearNotifications((req.user as any).id);
    res.status(204).send();
  });

  app.post(api.sales.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.sales.create.input.parse(req.body);
      const sale = await storage.createSale(input);
      
      // Log notification
      await storage.createNotification({
        userId: (req.user as any).id,
        action: "CRÉATION",
        target: `Facture ${sale.invoiceNumber}`,
        details: `Client: ${sale.clientName}`
      });

      res.status(201).json(sale);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.sales.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    try {
      const input = api.sales.update.input.parse(req.body);
      const sale = await storage.updateSale(id, input);
      
      // Log notification
      await storage.createNotification({
        userId: (req.user as any).id,
        action: "MODIFICATION",
        target: `Facture ${sale.invoiceNumber}`,
        details: `Client: ${sale.clientName}`
      });

      res.json(sale);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Handle generic errors (like not found from storage)
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  app.delete(api.sales.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    
    const sale = await storage.getSale(id);
    if (sale) {
      await storage.deleteSale(id);
      
      // Log notification
      await storage.createNotification({
        userId: (req.user as any).id,
        action: "SUPPRESSION",
        target: `Facture ${sale.invoiceNumber}`,
        details: `Client: ${sale.clientName}`
      });
    }

    res.status(204).send();
  });

  app.post(api.sales.bulkCreate.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.sales.bulkCreate.input.parse(req.body);
      const sales = await storage.bulkCreateSales(input);
      res.status(201).json(sales);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // CSV Import endpoint
  app.post("/api/sales/import-csv", isAuthenticated, async (req, res) => {
    try {
      if (!req.body || !req.body.csv) {
        return res.status(400).json({ message: "CSV data is required" });
      }

      // Handle base64 encoded CSV or direct text
      let csvBuffer: Buffer;
      if (typeof req.body.csv === "string") {
        // Try to decode as base64 first, if that fails, use as plain text
        try {
          csvBuffer = Buffer.from(req.body.csv, "base64");
        } catch {
          csvBuffer = Buffer.from(req.body.csv, "utf-8");
        }
      } else {
        return res.status(400).json({ message: "Invalid CSV format" });
      }

      const result = await importCSVFromBuffer(csvBuffer, {
        skipDuplicates: req.body.skipDuplicates !== false,
      });

      // Log notification
      await storage.createNotification({
        userId: (req.user as any).id,
        action: "IMPORT CSV",
        target: "Import de données",
        details: `${result.added} nouveaux enregistrements ajoutés, ${result.skipped} doublons ignorés`,
      });

      res.status(200).json(result);
    } catch (err: any) {
      console.error("CSV import error:", err);
      res.status(400).json({
        message: err.message || "Failed to import CSV",
      });
    }
  });

  // -----------------------------
  // Oil module (stock + sales)
  // -----------------------------

  app.get(api.oil.stock.get.path, isAuthenticated, async (_req, res) => {
    const stock = await storage.getOilStock();
    res.json(stock);
  });

  app.get(api.oil.sales.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getOilSales();
    res.json(rows);
  });

  app.post(api.oil.sales.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.oil.sales.create.input.parse(req.body);
      const row = await storage.createOilSale(input);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err?.status === 400) return res.status(400).json({ message: err.message || "Stock insuffisant" });
      throw err;
    }
  });

  app.put(api.oil.sales.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const input = api.oil.sales.update.input.parse(req.body);
      const row = await storage.updateOilSale(id, input);
      res.json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.status === 404) return res.status(404).json({ message: "Not found" });
      throw err;
    }
  });

  app.delete(api.oil.sales.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteOilSale(id);
    res.status(204).send();
  });

  app.get(api.oil.purchases.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getOilPurchases();
    res.json(rows);
  });

  app.post(api.oil.purchases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.oil.purchases.create.input.parse(req.body);
      const row = await storage.createOilPurchase(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.oil.purchases.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteOilPurchase(id);
    res.status(204).send();
  });

  // -----------------------------
  // Helmets module (stock + sales)
  // -----------------------------

  app.get(api.helmets.stock.get.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getHelmetStock();
    res.json(rows);
  });

  app.get(api.helmets.sales.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getHelmetSales();
    res.json(rows);
  });

  app.post(api.helmets.sales.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.helmets.sales.create.input.parse(req.body);
      const row = await storage.createHelmetSale(input);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err?.status === 400) return res.status(400).json({ message: err.message || "Stock insuffisant" });
      throw err;
    }
  });

  app.put(api.helmets.sales.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const input = api.helmets.sales.update.input.parse(req.body);
      const row = await storage.updateHelmetSale(id, input);
      res.json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.status === 404) return res.status(404).json({ message: "Not found" });
      throw err;
    }
  });

  app.delete(api.helmets.sales.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteHelmetSale(id);
    res.status(204).send();
  });

  app.get(api.helmets.purchases.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getHelmetPurchases();
    res.json(rows);
  });

  app.post(api.helmets.purchases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.helmets.purchases.create.input.parse(req.body);
      const row = await storage.createHelmetPurchase(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.helmets.purchases.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteHelmetPurchase(id);
    res.status(204).send();
  });

  // -----------------------------
  // Saddles (Cache Selle)
  // -----------------------------

  app.get(api.saddles.stock.get.path, isAuthenticated, async (_req, res) => {
    const stock = await storage.getSaddleStock();
    res.json(stock);
  });

  app.get(api.saddles.sales.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getSaddleSales();
    res.json(rows);
  });

  app.post(api.saddles.sales.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.saddles.sales.create.input.parse(req.body);
      const row = await storage.createSaddleSale(input);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      if (err?.status === 400) return res.status(400).json({ message: err.message || "Stock insuffisant" });
      throw err;
    }
  });

  app.put(api.saddles.sales.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const input = api.saddles.sales.update.input.parse(req.body);
      const row = await storage.updateSaddleSale(id, input);
      res.json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.status === 404) return res.status(404).json({ message: "Not found" });
      throw err;
    }
  });

  app.delete(api.saddles.sales.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteSaddleSale(id);
    res.status(204).send();
  });

  app.get(api.saddles.purchases.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getSaddlePurchases();
    res.json(rows);
  });

  app.post(api.saddles.purchases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.saddles.purchases.create.input.parse(req.body);
      const row = await storage.createSaddlePurchase(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.delete(api.saddles.purchases.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteSaddlePurchase(id);
    res.status(204).send();
  });

  // -----------------------------
  // Deferred / Divers (stock + sales + purchases)
  // -----------------------------

  app.get(api.deferred.stock.get.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getDiversStock();
    res.json(rows);
  });

  app.get(api.deferred.sales.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getDeferredSales();
    res.json(rows);
  });

  app.post(api.deferred.sales.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.deferred.sales.create.input.parse(req.body);
      const row = await storage.createDeferredSale(input);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      if (err?.status === 400) return res.status(400).json({ message: err.message || "Stock insuffisant" });
      throw err;
    }
  });

  app.put(api.deferred.sales.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const input = api.deferred.sales.update.input.parse(req.body);
      const row = await storage.updateDeferredSale(id, input);
      res.json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.status === 404) return res.status(404).json({ message: "Not found" });
      throw err;
    }
  });

  app.delete(api.deferred.sales.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteDeferredSale(id);
    res.status(204).send();
  });

  app.get(api.deferred.purchases.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getDiversPurchases();
    res.json(rows);
  });

  app.post(api.deferred.purchases.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.deferred.purchases.create.input.parse(req.body);
      const row = await storage.createDiversPurchase(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.deferred.purchases.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteDiversPurchase(id);
    res.status(204).send();
  });

  // -----------------------------
  // Clients
  // -----------------------------

  app.get(api.clients.list.path, isAuthenticated, async (_req, res) => {
    const rows = await storage.getClients();
    res.json(rows);
  });

  app.post(api.clients.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const row = await storage.createClient(input);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.put(api.clients.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const input = api.clients.update.input.parse(req.body);
      const row = await storage.updateClient(id, input);
      res.json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.status === 404) return res.status(404).json({ message: "Not found" });
      throw err;
    }
  });

  app.delete(api.clients.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteClient(id);
    res.status(204).send();
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  // Seed users if they don't exist
  const karim = await storage.getUserByUsername("Karim");
  if (!karim) {
    console.log("Seeding user: Karim");
    await storage.createUser({
      username: "Karim",
      role: "manager"
    });
  }

  const yassin = await storage.getUserByUsername("Yassin");
  if (!yassin) {
    console.log("Seeding user: Yassin");
    await storage.createUser({
      username: "Yassin",
      role: "staff"
    });
  }

  // Seed sales if none exist
  const existingSales = await storage.getSales();
  if (existingSales.length === 0) {
    console.log("Seeding database with initial sales data...");
    
    const samplePaymentSchedule: Record<string, { amount: number, isPaid: boolean }> = {};
    
    // Simulate some payments
    PAYMENT_MONTHS.forEach((month, index) => {
      // First 3 months paid
      if (index < 3) {
        samplePaymentSchedule[month] = { amount: 500, isPaid: true };
      } else {
        samplePaymentSchedule[month] = { amount: 500, isPaid: false };
      }
    });

    await storage.createSale({
      invoiceNumber: "25/000001",
      date: "16/06/2025",
      designation: "PISTA VCX NOIRE NOIRE",
      clientType: "B2C",
      clientName: "Mr ZIED BOUAFIA",
      chassisNumber: "LCS4BGN60S1E00784",
      registrationNumber: "72925 DN",
      grayCardStatus: "Récupérée",
      totalToPay: 7000,
      advance: 2000,
      payments: samplePaymentSchedule
    });

    await storage.createSale({
      invoiceNumber: "25/000002",
      date: "17/06/2025",
      designation: "GHOST V7 124CC BLEUE JAUNE",
      clientType: "B2C",
      clientName: "Mr MED MAROUEN EL HAJRI",
      chassisNumber: "LEHTCJ015RRM00155",
      registrationNumber: "58968 DN",
      grayCardStatus: "A Déposer",
      totalToPay: 8500,
      advance: 1500,
      payments: {} // No payments set up yet
    });
  }

  // Seed oil sales if empty
  const existingOilSales = await storage.getOilSales();
  if (existingOilSales.length === 0) {
    console.log("Seeding oil module with initial data...");
    const oilSeed: InsertOilSale[] = [
      { date: "2026-02-23", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Kilani" },
      { date: "2025-07-15", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "WAHID" },
      { date: "2025-07-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "ANAS", client: "" },
      { date: "2025-07-20", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "WAHID" },
      { date: "2025-07-28", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "ANAS" },
      { date: "2025-07-30", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-07-29", huile10w40: 0, huile20w50: 2, prix: 36, encaissement: "ANAS", client: "HM+KR" },
      { date: "2025-07-31", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "Abdelkader" },
      { date: "2025-08-02", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "ANAS", client: "???" },
      { date: "2025-08-05", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "ANAS", client: "KARIM" },
      { date: "2025-08-13", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "HASSEN" },
      { date: "2025-08-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "Ghassen" },
      { date: "2025-08-18", huile10w40: 0, huile20w50: 2, prix: 36, encaissement: "KARIM", client: "" },
      { date: "2025-08-19", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-08-20", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-08-21", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "ANAS", client: "" },
      { date: "2025-08-27", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "ANAS", client: "Jlassi" },
      { date: "2025-09-01", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "ANAS", client: "Bilel" },
      { date: "2025-09-03", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "ANAS", client: "Adem" },
      { date: "2025-09-08", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "??" },
      { date: "2025-09-10", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "WAEL" },
      { date: "2025-09-15", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "WAEL" },
      { date: "2025-09-18", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "IBRAHIM" },
      { date: "2025-09-19", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-09-19", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "ABDERAZEK" },
      { date: "2025-09-23", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "YOSRI" },
      { date: "2025-09-25", huile10w40: 1, huile20w50: 0, prix: 20, encaissement: "KARIM", client: "" },
      { date: "2025-09-30", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-10-02", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-10-06", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-10-07", huile10w40: 0, huile20w50: 1, prix: 20, encaissement: "KARIM", client: "" },
      { date: "2025-10-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "Beb Hssine" },
      { date: "2025-10-31", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "BASSEM", client: "13" },
      { date: "2025-11-01", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "SADOK" },
      { date: "2025-11-06", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "SKANDER" },
      { date: "2025-11-11", huile10w40: 0, huile20w50: 1, prix: 20, encaissement: "BASSEM", client: "" },
      { date: "2025-11-19", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-11-21", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-11-25", huile10w40: 1, huile20w50: 0, prix: 20, encaissement: "KARIM", client: "" },
      { date: "2025-11-29", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-12-08", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-12-09", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "ZIED" },
      { date: "2025-12-11", huile10w40: 0, huile20w50: 1, prix: 19, encaissement: "KARIM", client: "" },
      { date: "2025-12-12", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-12-16", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-12-18", huile10w40: 1, huile20w50: 0, prix: 20, encaissement: "KARIM", client: "" },
      { date: "2025-12-19", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "" },
      { date: "2025-12-20", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-12-20", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-12-22", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2025-12-30", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "BASSEM", client: "" },
      { date: "2026-01-02", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-01-05", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-01-08", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-01-10", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-01-13", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-01-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "Adam BEN HSIN" },
      { date: "2026-01-21", huile10w40: 0, huile20w50: 1, prix: 20, encaissement: "KARIM", client: "LARIANI" },
      { date: "2026-01-26", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Ramzi BALOUTI" },
      { date: "2026-01-26", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-02-02", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "YASSIN", client: "" },
      { date: "2026-02-02", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Ali" },
      { date: "2026-02-04", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "wael" },
      { date: "2026-02-05", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "Adam BEN HSIN" },
      { date: "2026-02-06", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "KARIM", client: "SABER HR" },
      { date: "2026-02-09", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Sami" },
      { date: "2026-02-09", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Abdeslem" },
      { date: "2026-02-14", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "YASSIN", client: "Adam" },
      { date: "2026-02-14", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "Skander" },
      { date: "2026-02-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "YASSIN", client: "Saber Hr" },
      { date: "2026-02-16", huile10w40: 1, huile20w50: 0, prix: 18, encaissement: "YASSIN", client: "Amir kirat" },
      { date: "2026-02-16", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "KARIM", client: "Zied Mlawah" },
      { date: "2026-02-17", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "abdlkader hedfi" },
      { date: "2026-02-17", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "choaaib" },
      { date: "2026-02-18", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Ramzi ballouti" },
      { date: "2026-02-20", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Hazem Aalayet" },
      { date: "2026-02-23", huile10w40: 0, huile20w50: 1, prix: 18, encaissement: "YASSIN", client: "Yacin Allagui" },
    ];
    await storage.seedOilSales(oilSeed);
  }

  // Seed helmet sales if empty
  const existingHelmetSales = await storage.getHelmetSales();
  if (existingHelmetSales.length === 0) {
    console.log("Seeding helmets module with initial data...");
    const helmetSeed: InsertHelmetSale[] = [
      {
        numeroFacture: "25/000081",
        date: "2025-11-17",
        designation: "CASQUE LS2 AIRFLOW MATT-Taille XXL",
        typeClient: "B2B",
        nomPrenom: "STE AKRAM DE COMMERCE ET SERVICES",
        quantite: 1,
        montant: 385,
      },
      {
        numeroFacture: "25/000082",
        date: "2025-11-17",
        designation: "CASQUE LS2 AIRFLOW GLOSS -Taille L",
        typeClient: "B2C",
        nomPrenom: "Skander SHILI",
        quantite: 1,
        montant: 100,
      },
      {
        numeroFacture: "25/000087",
        date: "2025-11-25",
        designation: "CASQUE LS2 AIRFLOW MATT-Taille L",
        typeClient: "B2C",
        nomPrenom: "Zaid BAILI",
        quantite: 1,
        montant: 350,
      },
      {
        numeroFacture: "25/000089",
        date: "2025-12-09",
        designation: "CASQUE LS2 AIRFLOW GLOSS -Taille L",
        typeClient: "B2C",
        nomPrenom: "Mohamed RAYEN MATHLOUTHI",
        quantite: 1,
        montant: 385,
      },
      {
        numeroFacture: "25/000094",
        date: "2025-12-20",
        designation: "CASQUE LS2 AIRFLOW MATT-Taille M",
        typeClient: "B2C",
        nomPrenom: "Moataz BOUAADILA",
        quantite: 1,
        montant: 375,
      },
      {
        numeroFacture: "26/000002",
        date: "2026-01-02",
        designation: "CASQUE MT Taille M MATT",
        typeClient: "B2C",
        nomPrenom: "Skander SHILI",
        quantite: 1,
        montant: 275,
      },
      {
        numeroFacture: "07",
        date: "2026-02-07",
        designation: "CASQUE TNL Gris-Taille XL",
        typeClient: "B2C",
        nomPrenom: "Mohamed Ali NASRALLAH",
        quantite: 1,
        montant: 140,
      },
      {
        numeroFacture: "11",
        date: "2026-02-11",
        designation: "Casque TNL Black Taille L",
        typeClient: "B2B",
        nomPrenom: "Charef Eddin ALAAMRI",
        quantite: 1,
        montant: 148,
      },
      {
        numeroFacture: "14",
        date: "2026-02-14",
        designation: "Casque TNL Noir Taille XL",
        typeClient: "B2B",
        nomPrenom: "Dhia Bouaadila",
        quantite: 1,
        montant: 148,
      },
      {
        numeroFacture: "26/000021",
        date: "2026-02-16",
        designation: "CASQUE TNL Gris-Taille L",
        typeClient: "B2B",
        nomPrenom: "Hazem BEN AALAYET",
        quantite: 1,
        montant: 148,
      },
    ];
    await storage.seedHelmetSales(helmetSeed);
  }

  // Seed saddle sales if empty (need purchases first for stock)
  const existingSaddleSales = await storage.getSaddleSales();
  if (existingSaddleSales.length === 0) {
    console.log("Seeding saddles module with initial data...");
    // Add initial purchase for stock
    await storage.createSaddlePurchase({ date: "2025-08-01", tailleXl: 50, tailleXxl: 50, fournisseur: "Initial", prix: 0 });
    const saddleSeed: InsertSaddleSale[] = [
      { date: "2025-09-01", tailleXl: 1, tailleXxl: 0, prix: 15, encaissement: "ANAS", client: "Khmais" },
      { date: "2025-09-02", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "ANAS", client: "Hmaida" },
      { date: "2025-09-10", tailleXl: 1, tailleXxl: 0, prix: 0, encaissement: "KARIM", client: "KASDAOUI" },
      { date: "2025-09-20", tailleXl: 1, tailleXxl: 0, prix: 15, encaissement: "KARIM", client: "" },
      { date: "2025-09-23", tailleXl: 2, tailleXxl: 0, prix: 0, encaissement: "KARIM", client: "" },
      { date: "2025-10-06", tailleXl: 0, tailleXxl: 1, prix: 0, encaissement: "KARIM", client: "" },
      { date: "2025-11-27", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "KARIM", client: "" },
      { date: "2025-12-05", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "BASSEM", client: "" },
      { date: "2025-12-09", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "KARIM", client: "" },
      { date: "2025-12-09", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "KARIM", client: "ZIED" },
      { date: "2026-01-14", tailleXl: 1, tailleXxl: 0, prix: 15, encaissement: "YASSIN", client: "" },
      { date: "2026-01-22", tailleXl: 0, tailleXxl: 1, prix: 15, encaissement: "YASSIN", client: "SHILI" },
      { date: "2026-02-02", tailleXl: 1, tailleXxl: 0, prix: 15, encaissement: "YASSIN", client: "ALI" },
    ];
    await storage.seedSaddleSales(saddleSeed);
  }
}
