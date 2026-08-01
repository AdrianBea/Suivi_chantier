"use client";

import { useEffect, useRef } from "react";

export function Modal({
  onClose,
  width = 480,
  height,
  titleId,
  children,
}: {
  onClose: () => void;
  width?: number;
  height?: number;
  titleId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // ne pas utiliser dialog.close() ici : il déclenche l'event "close" -> onClose(),
    // ce qui referme immédiatement la modale au 2e passage de l'effet en StrictMode (dev)
    return () => dialog.removeAttribute("open");
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="nm-modal-pop"
      style={{
        background: "var(--nm-base)",
        border: "none",
        borderRadius: "var(--nm-radius-lg)",
        width,
        maxWidth: "95vw",
        height,
        maxHeight: "88vh",
        padding: 0,
        color: "var(--nm-text-primary)",
        boxShadow: "-10px -10px 24px var(--nm-shadow-light), 14px 14px 32px var(--nm-shadow-dark), 0 24px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: height ? "100%" : undefined, maxHeight: "88vh", overflow: "hidden" }}>
        {children}
      </div>
    </dialog>
  );
}
