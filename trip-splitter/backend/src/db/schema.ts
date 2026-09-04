import { pgTable, text, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const participants = pgTable('participants', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  payerId: text('payer_id').notNull().references(() => participants.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const expenseSplits = pgTable('expense_splits', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id),
  amount: doublePrecision('amount').notNull(),
});