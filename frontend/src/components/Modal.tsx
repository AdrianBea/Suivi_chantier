"use client";

import { useEffect, useRef } from "react";

export function Modal({
  onClose,
  width = 480,
  titleId,
  children,
}: {
  onClose: () => void;
  width?: number;
  titleId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
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
      style={{
        background: "#1E1E1E",
        border: "1px solid #303030",
        borderRadius: 12,
        width,
        maxWidth: "95vw",
        maxHeight: "88vh",
        padding: 0,
        color: "#F0EDE8",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "88vh", overflow: "hidden" }}>
        {children}
      </div>
    </dialog>
  );
}
