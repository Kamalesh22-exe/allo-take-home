import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This fetches the details of a single reservation for the checkout page
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // We fetch the product name so the checkout page knows what to display
    const product = await prisma.product.findUnique({ where: { id: reservation.productId } });

    return NextResponse.json({
      ...reservation,
      productName: product?.name || "Unknown Product",
    });

  } catch (error) {
    console.error("Failed to fetch reservation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
