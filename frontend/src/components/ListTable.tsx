import { Children, cloneElement, Fragment, isValidElement } from "react";

export function ListTable<T>({ columns, rows, rowKey, onRowClick, renderRow, emptyLabel }: {
  columns: { label: string; width: string; align?: "left" | "center" | "right" }[];
  rows: T[];
  rowKey: (row: T) => React.Key;
  onRowClick: (row: T) => void;
  renderRow: (row: T) => React.ReactNode;
  emptyLabel: string;
}) {
  const gridTemplateColumns = columns.map((c) => c.width).join(" ");

  // en mode carte (<768px) le CSS restitue l'en-tête de colonne depuis data-label ;
  // on l'injecte ici pour que les pages appelantes n'aient pas à le porter.
  // `renderRow` renvoie un fragment : on descend d'un niveau pour atteindre les cellules.
  function labelCells(row: T) {
    const rendered = renderRow(row);
    const cells = isValidElement<{ children?: React.ReactNode }>(rendered) && rendered.type === Fragment
      ? rendered.props.children
      : rendered;

    return Children.map(cells, (child, i) =>
      isValidElement<{ "data-label"?: string }>(child)
        ? cloneElement(child, { "data-label": columns[i]?.label ?? "" })
        : child,
    );
  }

  return (
    <div className="nm-card table-to-cards-card" style={{ overflow: "hidden" }}>
      <div className="overflow-x-auto table-to-cards-wrap">
        <div style={{ minWidth: "fit-content" }} className="table-to-cards">
          <div className="tc-head" style={{ display: "grid", gridTemplateColumns, padding: "0 20px", borderBottom: "1px solid var(--nm-border)", background: "var(--nm-base-sunken)" }}>
            {columns.map((c, i) => (
              <div key={i} style={{ padding: "11px 12px", fontSize: 10, letterSpacing: "0.1em", color: "var(--nm-text-faint)", textTransform: "uppercase", fontFamily: "monospace", textAlign: c.align }}>{c.label}</div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--nm-text-faint)", fontSize: 13 }}>{emptyLabel}</div>
          ) : rows.map((row, i) => (
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
              className="nm-row-in tc-row"
              style={{ display: "grid", gridTemplateColumns, padding: "0 20px", borderBottom: "1px solid var(--nm-border)", cursor: "pointer", transition: "background-color 180ms ease-out", animationDelay: `${Math.min(i, 20) * 25}ms` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--nm-base-sunken)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {labelCells(row)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
