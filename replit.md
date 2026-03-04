# Speed Bike Motos - Sales & Inventory Management

## Project Overview
A comprehensive management system for a motorcycle dealership in Tunisia.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Express, SQLite (via Drizzle ORM)
- **State Management**: TanStack Query (React Query) v5
- **Routing**: wouter

## Modules
- **Dashboard**: Overview of sales and quick stats.
- **Gestion Vente**: Create Quotes (Devis), Delivery Notes (BL), and Invoices (Facture).
- **Gestion Stock**: Product management, families, and real-time stock tracking.
- **Gestion Achats**: Purchase receipts (Bon de Réception) that increment stock.
- **Gestion Clients**: Detailed client database.
- **Specialized Modules**: Oil, Helmets, Saddles, and Divers (with dedicated stock logic).

## Key Workflows
1. **Purchase**: Create Bon de Réception -> Validate -> Stock Increases.
2. **Sale**: Create Devis -> Convert to BL -> Validate BL -> Stock Decreases -> Create Facture.

## Database Schema
Defined in `shared/schema.ts`. Uses SQLite with Drizzle ORM.
- `products`: Core inventory table.
- `bon_livraison`: Linked to `bl_lines`, handles stock decrement on validation.
- `purchase_receipts`: Linked to `purchase_items`, handles stock increment on validation.
- `clients`: Centralized client information.
