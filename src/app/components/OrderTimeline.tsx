import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ORDER_STATUS_ICON } from "@/lib/orderStatus";

type HistoryEntry = { status: string; createdAt: string | Date };

function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function OrderTimeline({
  history,
  fallbackCreatedAt,
}: {
  history: HistoryEntry[];
  fallbackCreatedAt: string | Date;
}) {
  // Pedidos antigos criados antes dessa feature não têm histórico salvo.
  const entries = history.length > 0
    ? [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [{ status: "__created__", createdAt: fallbackCreatedAt }];

  return (
    <div>
      {entries.map((entry, idx) => {
        const isFallback = entry.status === "__created__";
        const color = isFallback ? { bg: "#fff8e1", color: "var(--gold)" } : (ORDER_STATUS_COLOR[entry.status] || { bg: "#f0f0f0", color: "#666" });
        const icon = isFallback ? "🧾" : (ORDER_STATUS_ICON[entry.status] || "•");
        const label = isFallback ? "Pedido criado" : (ORDER_STATUS_LABEL[entry.status] || entry.status);
        const isLast = idx === entries.length - 1;

        return (
          <div key={idx} style={{ display: "flex", gap: "0.875rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                backgroundColor: color.bg, color: color.color,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
              }}>
                {icon}
              </div>
              {!isLast && <div style={{ width: 2, flex: 1, backgroundColor: "rgba(184,137,26,0.2)", minHeight: 22 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? "0.25rem" : "1.1rem" }}>
              <p style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem" }}>{label}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{fmtDateTime(entry.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
