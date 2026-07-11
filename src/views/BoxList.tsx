import { useMemo, useState } from "react";
import type { Box, BoxStatus } from "../types";
import { STATUSES } from "../types";

export function BoxList({ boxes }: { boxes: Box[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoxStatus | "Alla">("Alla");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUSES) c[s] = 0;
    for (const b of boxes) c[b.status]++;
    return c;
  }, [boxes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boxes.filter((b) => {
      if (statusFilter !== "Alla" && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.title, b.innehall, b.franRum, b.tillPlats]
        .join("\n")
        .toLowerCase()
        .includes(q);
    });
  }, [boxes, search, statusFilter]);

  return (
    <div>
      <div className="toolbar">
        <a className="btn btn-primary" href="#/new">+ Ny låda</a>
        <a className="btn" href="#/print">🖨 Skriv ut etiketter</a>
        <span className="spacer" />
        <input
          type="search"
          placeholder="Sök ID, innehåll, rum…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chips">
        <button
          className={`chip ${statusFilter === "Alla" ? "chip-active" : ""}`}
          onClick={() => setStatusFilter("Alla")}
        >
          Alla ({boxes.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`chip ${statusFilter === s ? "chip-active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="muted">
          {boxes.length === 0
            ? "Inga lådor registrerade ännu. Skapa den första med “+ Ny låda”."
            : "Inga lådor matchar filtret."}
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Innehåll</th>
                <th>Från</th>
                <th>Till</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.itemId}
                  onClick={() =>
                    (window.location.hash = `#/box/${encodeURIComponent(b.title)}`)
                  }
                >
                  <td className="box-id">
                    {b.title}
                    {b.omtaligt && <span title="Ömtåligt"> ⚠</span>}
                  </td>
                  <td className="truncate">{b.innehall.split("\n")[0]}</td>
                  <td>{b.franRum}</td>
                  <td>{b.tillPlats}</td>
                  <td>
                    <span className={`badge status-${b.status.replace(/\s/g, "-")}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
