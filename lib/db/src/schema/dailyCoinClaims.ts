import { pgTable, serial, integer, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const dailyCoinClaimsTable = pgTable("daily_coin_claims", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  claimDate: date("claim_date").notNull(),
  coins: integer("coins").notNull().default(10),
});
