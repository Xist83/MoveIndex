import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AccountInfo } from "@azure/msal-browser";
import { initAuth, login, logout } from "./auth";
import { config, isConfigured } from "./config";
import { ensureList, listBoxes, ListMissingError } from "./sharepoint";
import type { Box } from "./types";
import { BoxList } from "./views/BoxList";
import { BoxEdit } from "./views/BoxEdit";
import { BoxDetail } from "./views/BoxDetail";
import { PrintLabels } from "./views/PrintLabels";
import "./styles.css";
import "./print.css";

type Route =
  | { view: "list" }
  | { view: "new" }
  | { view: "edit"; title: string }
  | { view: "box"; title: string }
  | { view: "print" };

function parseHash(): Route {
  const h = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
  const slash = h.indexOf("/");
  const first = slash === -1 ? h : h.slice(0, slash);
  const arg = slash === -1 ? "" : h.slice(slash + 1);
  if (first === "new") return { view: "new" };
  if (first === "edit" && arg) return { view: "edit", title: arg };
  if (first === "box" && arg) return { view: "box", title: arg };
  if (first === "print") return { view: "print" };
  return { view: "list" };
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [route, setRoute] = useState<Route>(parseHash());
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [listMissing, setListMissing] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true);
      return;
    }
    initAuth()
      .then((acc) => setAccount(acc))
      .catch((e) => setError(String(e)))
      .finally(() => setAuthReady(true));
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setBoxes(await listBoxes());
      setListMissing(false);
    } catch (e) {
      if (e instanceof ListMissingError) setListMissing(true);
      else setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (account) void refresh();
  }, [account, refresh]);

  async function createList() {
    setCreatingList(true);
    setError(null);
    try {
      await ensureList();
      setListMissing(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingList(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="center-card">
        <h1>📦 MoveIndex</h1>
        <p>
          Appen är inte konfigurerad ännu. Fyll i värdena i{" "}
          <code>src/config.ts</code>:
        </p>
        <ul className="setup-list">
          <li><code>clientId</code> – från appregistreringen i Entra ID</li>
          <li><code>tenantId</code> – ert directory/tenant-id</li>
          <li><code>siteHostname</code> + <code>sitePath</code> – SharePoint-siten</li>
        </ul>
        <p>Se README.md för hela uppsättningsguiden.</p>
      </div>
    );
  }

  if (!authReady) {
    return <div className="center-card"><p>Startar…</p></div>;
  }

  if (!account) {
    return (
      <div className="center-card">
        <h1>📦 MoveIndex</h1>
        <p>Spårbara flyttlådor med QR-etiketter.</p>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" onClick={login}>
          Logga in med Microsoft 365
        </button>
      </div>
    );
  }

  if (listMissing) {
    return (
      <div className="center-card">
        <h1>📦 MoveIndex</h1>
        <p>
          Listan <strong>{config.listName}</strong> finns inte på{" "}
          <strong>{config.siteHostname}{config.sitePath}</strong>.
        </p>
        {error && <div className="error">{error}</div>}
        <button
          className="btn btn-primary"
          onClick={() => void createList()}
          disabled={creatingList}
        >
          {creatingList ? "Skapar…" : "Skapa listan med rätt kolumner"}
        </button>
      </div>
    );
  }

  let content;
  if (boxes === null) {
    content = <p className="muted">Hämtar lådor…</p>;
  } else if (route.view === "new") {
    content = <BoxEdit boxes={boxes} box={null} onSaved={refresh} />;
  } else if (route.view === "edit") {
    const box = boxes.find((b) => b.title === route.title) ?? null;
    content = box ? (
      <BoxEdit boxes={boxes} box={box} onSaved={refresh} />
    ) : (
      <p className="muted">Hittar ingen låda med ID {route.title}.</p>
    );
  } else if (route.view === "box") {
    const box = boxes.find((b) => b.title === route.title) ?? null;
    content = box ? (
      <BoxDetail box={box} onChanged={refresh} />
    ) : (
      <p className="muted">Hittar ingen låda med ID {route.title}.</p>
    );
  } else if (route.view === "print") {
    content = <PrintLabels boxes={boxes} />;
  } else {
    content = <BoxList boxes={boxes} />;
  }

  return (
    <>
      <header className="no-print">
        <a href="#/" className="brand">📦 MoveIndex</a>
        <span className="spacer" />
        <span className="user">{account.name ?? account.username}</span>
        <button className="btn btn-ghost" onClick={logout}>Logga ut</button>
      </header>
      <main>
        {error && <div className="error no-print">{error}</div>}
        {content}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
