import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This handles the GET request for /api/warehouses
export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany();
    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Failed to fetch warehouses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
