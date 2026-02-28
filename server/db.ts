
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

const dbPath =
  process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "data.sqlite");

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
