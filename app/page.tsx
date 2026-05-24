"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Defining the shape of our data based on our API
type Inventory = {
  warehouseId: string;
  warehouseName: string;
  availableStock: number;
};

type Product = {
  id: string;
  name: string;
  stock: Inventory[];
};

export default function ProductListing() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);

  // Fetch the products when the page loads
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load products.");
        setLoading(false);
      });
  }, []);

  // Handle the Reserve Button click
  const handleReserve = async (productId: string, warehouseId: string) => {
    setError(null);
    setReservingId(`${productId}-${warehouseId}`); // Show a loading state on the specific button

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        // The prompt specifically asks to show the 409 error to the user!
        if (res.status === 409) {
          throw new Error("Someone else just grabbed the last one! Out of stock.");
        }
        throw new Error(data.error || "Failed to reserve product.");
      }

      // Success! Send the user to the checkout page with their new reservation ID
      router.push(`/checkout/${data.id}`);
      
    } catch (err: any) {
      setError(err.message);
      // If it fails, refresh the product list to show the true available stock
      fetch("/api/products").then((res) => res.json()).then(setProducts);
    } finally {
      setReservingId(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-xl">Loading store...</div>;

  return (
    <main className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">Allo Tech Store</h1>

      {/* Display our 409 Concurrency Errors here */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6">
        {products.map((product) => (
          <div key={product.id} className="border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">{product.name}</h2>
            
            <div className="space-y-4">
              {product.stock.map((inv) => {
                const isOutOfStock = inv.availableStock <= 0;
                const isReserving = reservingId === `${product.id}-${inv.warehouseId}`;

                return (
                  <div key={inv.warehouseId} className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
                    <div>
                      <p className="font-medium">{inv.warehouseName}</p>
                      <p className={`text-sm ${isOutOfStock ? "text-red-500 font-bold" : "text-green-600"}`}>
                        {isOutOfStock ? "Out of Stock" : `${inv.availableStock} available`}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleReserve(product.id, inv.warehouseId)}
                      disabled={isOutOfStock || isReserving}
                      className={`px-4 py-2 rounded-md font-medium text-white transition-colors
                        ${isOutOfStock 
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"}
                        ${isReserving ? "opacity-75 cursor-wait" : ""}
                      `}
                    >
                      {isReserving ? "Reserving..." : "Reserve & Checkout"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
