"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params); // Unwraps the dynamic URL ID
  const router = useRouter();

  const [reservation, setReservation] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<"LOADING" | "PENDING" | "CONFIRMED" | "EXPIRED" | "RELEASED">("LOADING");
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch the reservation data when the page loads
  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setStatus("EXPIRED");
          return;
        }
        setReservation(data);
        setStatus(data.status);
      });
  }, [id]);

  // 2. The Live Countdown Timer Logic
  useEffect(() => {
    if (status !== "PENDING" || !reservation) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(reservation.expiresAt).getTime();
      const distance = expires - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setStatus("EXPIRED");
        setError("Your reservation timer ran out! (410 Expired)");
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation, status]);

  // 3. Handle the Confirm Purchase button
  const handleConfirm = async () => {
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setStatus("EXPIRED");
          throw new Error("Too slow! Reservation expired (410).");
        }
        throw new Error(data.error);
      }
      setStatus("CONFIRMED");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 4. Handle the Cancel button
  const handleCancel = async () => {
    try {
      await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      setStatus("RELEASED");
    } catch (err) {
      console.error(err);
    }
  };

  if (status === "LOADING") return <div className="p-10 text-center text-xl">Loading checkout...</div>;

  // Format the raw seconds into a nice MM:SS clock
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <main className="max-w-2xl mx-auto p-8 font-sans">
      <div className="border border-gray-200 rounded-lg p-8 shadow-md bg-white">
        <h1 className="text-3xl font-bold mb-6 border-b pb-4">Checkout</h1>

        {/* Display our 410 Expired Errors here */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800">Order Summary</h2>
          <p className="text-lg text-gray-600 mt-2">{reservation?.productName}</p>
          <p className="text-sm text-gray-500">Quantity: {reservation?.quantity}</p>
        </div>

        {status === "PENDING" && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-6 text-center mb-8">
            <p className="text-orange-800 font-medium mb-2">Your item is reserved for:</p>
            <p className="text-5xl font-mono font-bold text-orange-600">{timeString}</p>
          </div>
        )}

        {status === "CONFIRMED" && (
          <div className="bg-green-100 text-green-800 p-6 rounded-md text-center mb-8 text-xl font-bold">
            🎉 Purchase Successful!
          </div>
        )}

        {status === "RELEASED" && (
          <div className="bg-gray-100 text-gray-800 p-6 rounded-md text-center mb-8 text-xl font-bold">
            Reservation Cancelled.
          </div>
        )}

        {status === "PENDING" && (
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
            >
              Confirm Purchase
            </button>
          </div>
        )}

        {status !== "PENDING" && (
          <button
            onClick={() => router.push("/")}
            className="w-full mt-4 py-3 px-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            Return to Store
          </button>
        )}
      </div>
    </main>
  );
}
