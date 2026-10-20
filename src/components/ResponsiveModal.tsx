import { ReactNode } from "react";
import { useMobileView } from "@/hooks/useMediaQuery";

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeButton?: boolean;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  closeButton = true,
}: ResponsiveModalProps) {
  const isMobile = useMobileView();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: isMobile ? "1rem 1rem 0 0" : "1rem",
          padding: isMobile ? "1.5rem 1rem" : "2rem",
          maxWidth: isMobile ? "100%" : "500px",
          width: "100%",
          maxHeight: isMobile ? "80vh" : "70vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              color: "var(--text-main)",
              fontWeight: 900,
              fontSize: isMobile ? "1.1rem" : "1.2rem",
              margin: 0,
            }}
          >
            {title}
          </h3>
          {closeButton && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
