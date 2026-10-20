"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ orderId }: { orderId: string }) {
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
    setCancelling(true);
    await fetch(`/api/admin/pedidos/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setCancelling(false);
    router.refresh();
  };

  return (
    <button onClick={handleCancel} disabled={cancelling}
      style={{ marginTop: "0.75rem", padding: "0.5rem 1rem", backgroundColor: "rgba(255,138,122,0.14)", color: "#ff8a7a", border: "1px solid rgba(255,138,122,0.28)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", width: "100%" }}>
      {cancelling ? "Cancelando..." : "Cancelar pedido"}
    </button>
  );
}
