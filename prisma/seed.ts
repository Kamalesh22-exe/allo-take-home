import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Set up a connection pool using the standard Postgres driver
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

// 2. Create the Prisma adapter for Postgres
const adapter = new PrismaPg(pool);

// 3. Pass the adapter into the Prisma Client!
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up existing data...");
  await prisma.reservation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.warehouse.deleteMany({});

  console.log("Creating warehouses...");
  const chennaiWarehouse = await prisma.warehouse.create({
    data: { name: "Chennai Fulfillment Center" },
  });
  const mumbaiWarehouse = await prisma.warehouse.create({
    data: { name: "Mumbai Hub" },
  });

  console.log("Creating products...");
  const product1 = await prisma.product.create({
    data: { name: "Ergonomic Mechanical Keyboard" },
  });
  const product2 = await prisma.product.create({
    data: { name: "Ultra-Fast Wireless Mouse" },
  });
  const product3 = await prisma.product.create({
    data: { name: "4K UltraWide Monitor" },
  });

  console.log("Assigning stock levels to warehouses...");
  await prisma.inventory.createMany({
    data: [
      { productId: product1.id, warehouseId: chennaiWarehouse.id, totalUnits: 5, reservedUnits: 0 },
      { productId: product1.id, warehouseId: mumbaiWarehouse.id, totalUnits: 2, reservedUnits: 0 },
      { productId: product2.id, warehouseId: chennaiWarehouse.id, totalUnits: 10, reservedUnits: 0 },
      { productId: product2.id, warehouseId: mumbaiWarehouse.id, totalUnits: 1, reservedUnits: 0 }, 
      { productId: product3.id, warehouseId: chennaiWarehouse.id, totalUnits: 3, reservedUnits: 0 },
      { productId: product3.id, warehouseId: mumbaiWarehouse.id, totalUnits: 4, reservedUnits: 0 },
    ],
  });

  console.log("🌱 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });