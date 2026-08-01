import type { CSSProperties } from "react";

export const inputStyle: CSSProperties = {
  background: "var(--nm-base)",
  border: "none",
  borderRadius: "var(--nm-radius-sm)",
  boxShadow: "inset 3px 3px 6px var(--nm-shadow-dark), inset -3px -3px 6px var(--nm-shadow-light)",
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--nm-text-primary)",
};

export const buttonStyle: CSSProperties = {
  background: "var(--nm-base)",
  border: "none",
  borderRadius: "var(--nm-radius-sm)",
  boxShadow: "-4px -4px 10px var(--nm-shadow-light), 4px 4px 10px var(--nm-shadow-dark)",
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--nm-text-primary)",
  cursor: "pointer",
};

export const cardStyle: CSSProperties = {
  background: "var(--nm-base)",
  borderRadius: "var(--nm-radius-lg)",
  boxShadow: "-10px -10px 24px var(--nm-shadow-light), 14px 14px 32px var(--nm-shadow-dark)",
  padding: 32,
  width: 340,
  maxWidth: "90vw",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};
