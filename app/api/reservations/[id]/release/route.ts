import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    
    if (reservation.status !== "PENDING") {
      return NextResponse.json({ error: "Reservation already processed" }, { status: 400 });
    }

    // Release the hold! We drop the reserved count, but leave the total intact.
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: "RELEASED" } }),
      prisma.inventory.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: { reservedUnits: { decrement: reservation.quantity } }
      })
    ]);

    return NextResponse.json({ success: true, message: "Inventory released!" });

  } catch (error) {
    console.error("Failed to release:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
