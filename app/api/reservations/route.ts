import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, warehouseId, quantity = 1 } = body;

    if (!productId || !warehouseId) {
      return NextResponse.json({ error: "Missing productId or warehouseId" }, { status: 400 });
    }

    // 1. THE CONCURRENCY LOCK (The most important part of the exercise)
    // We use raw SQL to increment reservedUnits ONLY IF there is enough available stock.
    // PostgreSQL handles the row-level locking natively, preventing race conditions.
    const updatedRows = await prisma.$executeRaw`
      UPDATE "Inventory"
      SET "reservedUnits" = "reservedUnits" + ${quantity}
      WHERE "productId" = ${productId} 
        AND "warehouseId" = ${warehouseId}
        AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `;

    // 2. Handle the out-of-stock scenario (The 409 Error required by the prompt)
    if (updatedRows === 0) {
      return NextResponse.json(
        { error: "Not enough stock available or inventory record not found." }, 
        { status: 409 }
      );
    }

    // 3. Create the temporary reservation record (expires in 10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const reservation = await prisma.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: "PENDING",
        expiresAt,
      },
    });

    return NextResponse.json(reservation, { status: 201 });

  } catch (error) {
    console.error("Failed to create reservation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
