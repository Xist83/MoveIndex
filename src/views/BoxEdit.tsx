import { useMemo, useState, type FormEvent } from "react";
import { createBox, deleteBox, nextBoxId, updateBox } from "../sharepoint";
import { STATUSES, type Box, type BoxStatus } from "../types";

interface Props {
  boxes: Box[];
  /** null = skapa ny låda */
  box: Box | null;
  onSaved: () => Promise<void>;
}

export function BoxEdit({ boxes, box, onSaved }: Props) {
  const [title, setTitle] = useState(box ? box.title : nextBoxId(boxes));
  const [innehall, setInnehall] = useState(box?.innehall ?? "");
  const [franRum, setFranRum] = useState(box?.franRum ?? "");
  const [tillPlats, setTillPlats] = useState(box?.tillPlats ?? "");
  const [status, setStatus] = useState<BoxStatus>(box?.status ?? "Packad");
  const [omtaligt, setOmtaligt] = useState(box?.omtaligt ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rooms = useMemo(() => {
    const set = new Set<string>();
    for (const b of boxes) {
      if (b.franRum) set.add(b.franRum);
      if (b.tillPlats) set.add(b.tillPlats);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "sv"));
  }, [boxes]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const clash = boxes.find(
      (b) => b.title === trimmed && b.itemId !== box?.itemId,
    );
    if (clash) {
      setError(`Det finns redan en låda med ID ${trimmed}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fields = { title: trimmed, innehall, franRum, tillPlats, status, omtaligt };
      if (box) await updateBox(box.itemId, fields);
      else await createBox(fields);
      await onSaved();
      window.location.hash = `#/box/${encodeURIComponent(trimmed)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!box) return;
    if (!window.confirm(`Ta bort ${box.title}? Detta går inte att ångra.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteBox(box.itemId);
      await onSaved();
      window.location.hash = "#/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={(e) => void save(e)}>
      <h2>{box ? `Redigera ${box.title}` : "Ny låda"}</h2>
      {error && <div className="error">{error}</div>}

      <label>
        Låd-ID
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label>
        Innehåll (en rad per sak)
        <textarea
          rows={6}
          value={innehall}
          onChange={(e) => setInnehall(e.target.value)}
          placeholder={"Vinterjackor\nSkidhandskar\nMössor"}
        />
      </label>

      <div className="form-row">
        <label>
          Från rum
          <input
            list="rooms"
            value={franRum}
            onChange={(e) => setFranRum(e.target.value)}
            placeholder="t.ex. Kök"
          />
        </label>
        <label>
          Till plats
          <input
            list="rooms"
            value={tillPlats}
            onChange={(e) => setTillPlats(e.target.value)}
            placeholder="t.ex. Källare"
          />
        </label>
      </div>
      <datalist id="rooms">
        {rooms.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="form-row">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BoxStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={omtaligt}
            onChange={(e) => setOmtaligt(e.target.checked)}
          />
          Ömtåligt ⚠
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Sparar…" : "Spara"}
        </button>
        <a className="btn" href={box ? `#/box/${encodeURIComponent(box.title)}` : "#/"}>
          Avbryt
        </a>
        <span className="spacer" />
        {box && (
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => void remove()}
            disabled={busy}
          >
            Ta bort
          </button>
        )}
      </div>
    </form>
  );
}
