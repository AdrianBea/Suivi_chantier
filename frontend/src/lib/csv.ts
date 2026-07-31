function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => string | number | null | undefined }[]
): string {
  const lines = [
    columns.map((c) => escapeCsvCell(c.header)).join(";"),
    ...rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
