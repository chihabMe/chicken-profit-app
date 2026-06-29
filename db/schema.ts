import { pgTable, serial, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const simulations = pgTable('simulations', {
  id: serial('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const flocks = pgTable('flocks', {
  id: serial('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  name: text('name').notNull(),
  chicksBought: integer('chicks_bought').notNull(),
  startDate: text('start_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const flockLogs = pgTable('flock_logs', {
  id: serial('id').primaryKey(),
  flockId: integer('flock_id').notNull(),
  dayNumber: integer('day_number').notNull(),
  mortality: integer('mortality').notNull().default(0),
  feedIntakeKg: text('feed_intake_kg').notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
