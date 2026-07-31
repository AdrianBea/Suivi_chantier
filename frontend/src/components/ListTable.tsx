export function ListTable<T>({ columns, rows, rowKey, onRowClick, renderRow, emptyLabel }: {
  columns: { label: string; width: string; align?: "left" | "center" | "right" }[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  onRowClick: (row: T) => void;
  renderRow: (row: T) => React.ReactNode;
  emptyLabel: string;
}) {
  const gridTemplateColumns = columns.map((c) => c.width).join(" ");

  return (
    <div style={{ background: "#222", border: "1px solid #2C2C2C", borderRadius: 10, overflow: "hidden" }}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: "fit-content" }}>
          <div style={{ display: "grid", gridTemplateColumns, padding: "0 20px", borderBottom: "1px solid #2C2C2C", background: "#1E1E1E" }}>
            {columns.map((c, i) => (
              <div key={i} style={{ padding: "11px 12px", fontSize: 10, letterSpacing: "0.1em", color: "#555250", textTransform: "uppercase", fontFamily: "monospace", textAlign: c.align }}>{c.label}</div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#555250", fontSize: 13 }}>{emptyLabel}</div>
          ) : rows.map((row) => (
            <div
              key={rowKey(row)}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              style={{ display: "grid", gridTemplateColumns, padding: "0 20px", borderBottom: "1px solid #242424", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#272727")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {renderRow(row)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
