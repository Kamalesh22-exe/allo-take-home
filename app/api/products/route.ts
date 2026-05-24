import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // We fetch all products, and tell Prisma to include the related inventory and warehouse data
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // We format the data to calculate the exact available stock for the frontend
    const formattedProducts = products.map((product) => {
      return {
        id: product.id,
        name: product.name,
        stock: product.inventories.map((inv) => ({
          warehouseId: inv.warehouseId,
          warehouseName: inv.warehouse.name,
          availableStock: inv.totalUnits - inv.reservedUnits, // The crucial calculation!
          totalUnits: inv.totalUnits,
          reservedUnits: inv.reservedUnits,
        })),
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}