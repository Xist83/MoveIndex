import { useEffect, useState } from "react";
import { updateBox } from "../sharepoint";
import { qrDataUrl } from "../qr";
import { boxUrl, STATUSES, type Box, type BoxStatus } from "../types";

interface Props {
  box: Box;
  onChanged: () => Promise<void>;
}

/** Mobilanpassad vy – det QR-koden på etiketten öppnar. */
export function BoxDetail({ box, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void qrDataUrl(boxUrl(box.title)).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [box.title]);

  async function setStatus(status: BoxStatus) {
    if (status === box.status) return;
    setBusy(true);
    setError(null);
    try {
      await updateBox(box.itemId, { status });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const items = box.innehall.split("\n").filter((r) => r.trim() !== "");

  return (
    <div className="detail">
      <div className="detail-head">
        <h2>
          {box.title}
          {box.omtaligt && <span className="fragile-tag">⚠ ÖMTÅLIGT</span>}
        </h2>
        <a className="btn" href={`#/edit/${encodeURIComponent(box.title)}`}>
          Redigera
        </a>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="detail-route">
        <span>{box.franRum || "–"}</span>
        <span className="arrow">→</span>
        <span>{box.tillPlats || "–"}</span>
      </div>

      <div className="status-buttons">
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={busy}
            className={`btn status-btn ${box.status === s ? `btn-active status-${s.replace(/\s/g, "-")}` : ""}`}
            onClick={() => void setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <h3>Innehåll</h3>
      {items.length === 0 ? (
        <p className="muted">Inget innehåll registrerat.</p>
      ) : (
        <ul className="content-list">
          {items.map((row, i) => (
            <li key={i}>{row}</li>
          ))}
        </ul>
      )}

      <div className="detail-meta muted">
        {box.packadAv && <div>Packad av: {box.packadAv}</div>}
        {box.modified && (
          <div>Senast ändrad: {new Date(box.modified).toLocaleString("sv-SE")}</div>
        )}
      </div>

      {qr && (
        <details className="qr-preview">
          <summary>Visa QR-kod</summary>
          <img src={qr} alt={`QR-kod för ${box.title}`} width={160} height={160} />
        </details>
      )}
    </div>
  );
}
