import { useEffect, useMemo, useState } from "react";
import { qrDataUrl } from "../qr";
import { boxUrl, type Box } from "../types";

interface PrintSettings {
  cols: number;
  rows: number;
  labelW: number; // mm
  labelH: number; // mm
  marginTop: number; // mm
  marginLeft: number; // mm
  start: number; // första etikettposition på arket (1-baserad)
}

// Förval: Avery-ark 70×37 mm, 3 kolumner × 8 rader = 24 etiketter/A4
const DEFAULTS: PrintSettings = {
  cols: 3,
  rows: 8,
  labelW: 70,
  labelH: 37,
  marginTop: 0.5,
  marginLeft: 0,
  start: 1,
};

const STORAGE_KEY = "moveindex-print-settings";

function loadSettings(): PrintSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PrintSettings>) };
  } catch {
    // trasig lagring → använd förval
  }
  return { ...DEFAULTS };
}

export function PrintLabels({ boxes }: { boxes: Box[] }) {
  const [settings, setSettings] = useState<PrintSettings>(loadSettings);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(boxes.map((b) => b.itemId)),
  );
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const missing = boxes.filter((b) => selected.has(b.itemId) && !qrs[b.title]);
      if (missing.length === 0) return;
      const next: Record<string, string> = {};
      for (const b of missing) next[b.title] = await qrDataUrl(boxUrl(b.title));
      if (!cancelled) setQrs((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [boxes, selected, qrs]);

  function toggle(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function set<K extends keyof PrintSettings>(key: K, value: number) {
    if (!Number.isFinite(value)) return;
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  const perPage = Math.max(1, settings.cols * settings.rows);

  const pages = useMemo(() => {
    const chosen = boxes.filter((b) => selected.has(b.itemId));
    const startOffset = Math.min(Math.max(settings.start, 1), perPage) - 1;
    const slots: (Box | null)[] = [
      ...Array<Box | null>(startOffset).fill(null),
      ...chosen,
    ];
    const result: (Box | null)[][] = [];
    for (let i = 0; i < slots.length; i += perPage) {
      result.push(slots.slice(i, i + perPage));
    }
    return result;
  }, [boxes, selected, settings.start, perPage]);

  const numberInput = (
    label: string,
    key: keyof PrintSettings,
    step = 1,
  ) => (
    <label className="print-setting">
      {label}
      <input
        type="number"
        step={step}
        value={settings[key]}
        onChange={(e) => set(key, Number(e.target.value))}
      />
    </label>
  );

  return (
    <div>
      <div className="no-print">
        <div className="toolbar">
          <a className="btn" href="#/">← Tillbaka</a>
          <button
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={selected.size === 0}
          >
            🖨 Skriv ut ({selected.size} etiketter)
          </button>
        </div>

        <details className="print-settings" open>
          <summary>Etikettark-inställningar</summary>
          <div className="print-settings-grid">
            {numberInput("Kolumner", "cols")}
            {numberInput("Rader", "rows")}
            {numberInput("Etikettbredd (mm)", "labelW", 0.1)}
            {numberInput("Etiketthöjd (mm)", "labelH", 0.1)}
            {numberInput("Marginal topp (mm)", "marginTop", 0.1)}
            {numberInput("Marginal vänster (mm)", "marginLeft", 0.1)}
            {numberInput("Börja på position", "start")}
          </div>
          <p className="muted">
            Förval passar Avery 70×37 mm (24 st/A4). ”Börja på position” hoppar
            över redan använda etiketter på ett påbörjat ark. Välj{" "}
            <strong>Marginaler: Ingen</strong> och <strong>Skala: 100 %</strong>{" "}
            i webbläsarens utskriftsdialog.
          </p>
        </details>

        <div className="print-pick">
          <button
            className="chip"
            onClick={() => setSelected(new Set(boxes.map((b) => b.itemId)))}
          >
            Välj alla
          </button>
          <button className="chip" onClick={() => setSelected(new Set())}>
            Välj ingen
          </button>
          <div className="print-pick-list">
            {boxes.map((b) => (
              <label key={b.itemId} className="checkbox">
                <input
                  type="checkbox"
                  checked={selected.has(b.itemId)}
                  onChange={() => toggle(b.itemId)}
                />
                {b.title} {b.tillPlats && `→ ${b.tillPlats}`}
              </label>
            ))}
          </div>
        </div>

        <h3>Förhandsgranskning</h3>
      </div>

      <div className="sheets">
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="sheet"
            style={{
              paddingTop: `${settings.marginTop}mm`,
              paddingLeft: `${settings.marginLeft}mm`,
              gridTemplateColumns: `repeat(${settings.cols}, ${settings.labelW}mm)`,
              gridAutoRows: `${settings.labelH}mm`,
            }}
          >
            {page.map((box, i) =>
              box === null ? (
                <div key={i} className="label label-empty" />
              ) : (
                <div key={i} className="label">
                  <img src={qrs[box.title] ?? ""} alt="" />
                  <div className="label-text">
                    <div className="label-id">{box.title}</div>
                    {box.tillPlats && (
                      <div className="label-room">{box.tillPlats}</div>
                    )}
                    {box.omtaligt && (
                      <div className="label-fragile">⚠ ÖMTÅLIGT</div>
                    )}
                    {box.innehall.trim() && (
                      <div className="label-content">
                        {box.innehall
                          .split("\n")
                          .map((r) => r.trim())
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
