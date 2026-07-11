// ============================================================
// MoveIndex – konfiguration
// Fyll i värdena nedan enligt uppsättningsguiden i README.md.
// Inga värden här är hemliga – client-id för en SPA är publikt.
// ============================================================

const raw = {
  // Application (client) ID från appregistreringen i Entra ID
  clientId: "f719c7f4-1857-48cc-bb32-d5466c542822",

  // Directory (tenant) ID från Entra ID (eller "organizations")
  tenantId: "e044354c-f2a5-4c20-982c-eca7968ce9ea",

  // SharePoint-sitens värdnamn, t.ex. "dittforetag.sharepoint.com"
  siteHostname: "requtechse.sharepoint.com",

  // Sitens sökväg, t.ex. "/sites/Flytten"
  sitePath: "/sites/MoveIndex",

  // Namnet på SharePoint-listan. Finns den inte kan appen skapa den.
  listName: "Flyttlador",
};

// Normalisera så att inklistrade fullständiga URL:er också fungerar:
// "https://foretag.sharepoint.com/" → "foretag.sharepoint.com"
export const config = {
  ...raw,
  siteHostname: raw.siteHostname
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, ""),
  sitePath: "/" + raw.sitePath.replace(/^\/+|\/+$/g, ""),
};

export const isConfigured = !Object.values(config).some((v) =>
  v.includes("FYLL-I"),
);
