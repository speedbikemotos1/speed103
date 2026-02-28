# Speed Bike Moto - Sales & Payment Management System

## Overview

This is a sales and payment tracking application for a motorcycle dealership (Speed Bike Moto). The system manages vehicle sales records with a complex monthly payment schedule spanning from July 2025 to January 2028. Key features include tracking client information, vehicle details (chassis/registration numbers), gray card status with color-coded statuses, financial data (totals, advances), and monthly payment tracking with paid/unpaid states.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful API with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage

### Data Layer
- **Database**: PostgreSQL
- **Schema Definition**: Drizzle ORM schema in `shared/schema.ts`
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)
- **Key Entity**: Sales table with JSONB column for flexible monthly payment data storage

### Shared Code Architecture
- `shared/schema.ts`: Database schema, Zod validation schemas, and TypeScript types
- `shared/routes.ts`: API route definitions with input/output type contracts
- Path aliases configured: `@/` for client code, `@shared/` for shared code

### Build System
- Development: `tsx` for TypeScript execution
- Production: Custom build script using esbuild (server) and Vite (client)
- Output: Bundled to `dist/` directory with server as CommonJS and client as static files

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (required `DATABASE_URL` environment variable)
- **Drizzle ORM**: Query builder and schema management
- **connect-pg-simple**: PostgreSQL session store for Express

### UI Framework
- **Radix UI**: Headless component primitives (dialogs, dropdowns, tooltips, etc.)
- **Shadcn/ui**: Pre-styled component library
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation

### Data Management
- **TanStack React Query**: Server state synchronization
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **Tailwind CSS**: Utility-first CSS framework