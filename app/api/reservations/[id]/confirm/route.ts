import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js 15 requires us to await the dynamic params
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Find the pending reservation
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    
    if (reservation.status !== "PENDING") {
      return NextResponse.json({ error: "Reservation already processed" }, { status: 400 });
    }

    // 2. Check if the timer ran out! (The 410 error required by the prompt)
    if (new Date() > reservation.expiresAt) {
      // It expired! Release the inventory lock so someone else can buy it.
      await prisma.$transaction([
        prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
        prisma.inventory.update({
          where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
          data: { reservedUnits: { decrement: reservation.quantity } }
        })
      ]);
      return NextResponse.json({ error: "Reservation expired (410)" }, { status: 410 });
    }

    // 3. Payment Success! Permanently decrement the stock using an atomic transaction
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: "CONFIRMED" } }),
      prisma.inventory.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: {
          totalUnits: { decrement: reservation.quantity }, // Permanently gone from warehouse
          reservedUnits: { decrement: reservation.quantity } // Lock is removed
        }
      })
    ]);

    return NextResponse.json({ success: true, message: "Purchase confirmed!" });

  } catch (error) {
    console.error("Failed to confirm:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
