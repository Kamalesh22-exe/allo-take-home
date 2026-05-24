# Allo Engineering - Inventory Reservation System

This is a Next.js, Prisma, and Supabase (PostgreSQL) implementation of an inventory reservation system, designed to eliminate race conditions during high-concurrency checkout flows.

## How to run locally

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase connection strings:
   ```env
   DATABASE_URL="your-pooled-connection-string"
   DIRECT_URL="your-direct-connection-string"
   ```
3. **Database Setup:**
   Run the following commands to push the schema and seed the database with mock warehouses and products:
   ```bash
   npx prisma db push
   npx prisma generate
   npx prisma db seed
   ```
4. **Start the server:**
   ```bash
   npm run dev
   ```

## Architecture & Concurrency Strategy

The core challenge of this exercise is the Check-Then-Act race condition. If we check stock in Node.js and then write to the database, two simultaneous requests will both see available stock and double-sell the item.

**Solution:** I utilized PostgreSQL's native row-level locking via an atomic raw SQL query.
When a reservation is made, the system executes an `UPDATE` statement that increments the `reservedUnits` **only if** `(totalUnits - reservedUnits) >= requestedQuantity`. If the condition fails, the database updates 0 rows, and the API safely returns a 409 Conflict. This guarantees mathematically correct stock levels regardless of traffic volume.

## Expiry Mechanism

I implemented a **"Lazy Cleanup on Read/Write"** approach:
- Reservations are created with a 10-minute expiry timestamp.
- If a user attempts to confirm a reservation *after* the timer expires, the API catches the expired timestamp, immediately releases the inventory lock, and returns a 410 Gone error.
- *If I had more time:* I would implement a Vercel Cron Job to actively sweep the database every 5 minutes and automatically transition expired `PENDING` reservations to `RELEASED`, ensuring available stock numbers on the storefront remain highly accurate even if the original reserver abandons the tab.

## Trade-offs & Future Improvements
* **Idempotency:** Currently, retrying a reservation creates a new one. Implementing Idempotency-Keys using Redis (Upstash) would prevent duplicate network requests from locking up extra stock.
* **Separation of Concerns:** The API routes currently handle database logic directly. In a larger production app, I would extract the Prisma logic into dedicated service layers.
