# 📦 MoveIndex

Webbapp för spårbara flyttlådor: registrera lådor med innehåll, skriv ut
QR-etiketter på A4-etikettark, och skanna etiketten med mobilen för att se
lådans innehåll och uppdatera status (Packad → I transport → Levererad → Uppackad).

- **Ingen databas** – all data lagras i en SharePoint-lista via Microsoft Graph.
- **Ingen installation** – ren statisk webbapp (GitHub Pages); varje dator
  öppnar bara en URL och loggar in med sitt vanliga Microsoft 365-konto.
- **Ingen server, inga hemligheter** – inloggningen använder MSAL:s SPA-flöde
  (publik client-id + PKCE) direkt mot Entra ID.

## Teknik

Vite + React + TypeScript · `@azure/msal-browser` · Microsoft Graph REST · `qrcode`

## Engångsuppsättning

### 1. Registrera appen i Entra ID (kan kräva IT/admin)

1. Gå till [entra.microsoft.com](https://entra.microsoft.com) →
   **App registrations** → **New registration**.
2. Namn: t.ex. `MoveIndex`. Kontotyp: *Accounts in this organizational
   directory only*.
3. Under **Redirect URI**: välj plattform **Single-page application (SPA)**
   och lägg till:
   - `http://localhost:5173` (för lokal utveckling)
   - `https://<ditt-konto>.github.io/<repo-namn>/` (läggs till efter steg 3)
4. Under **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated** → lägg till `Sites.ReadWrite.All`. Klicka **Grant admin
   consent** om er tenant kräver det (annars godkänner varje användare vid
   första inloggningen).
5. Kopiera **Application (client) ID** och **Directory (tenant) ID** från
   översiktssidan.

> Vill IT begränsa åtkomsten till enbart flytt-siten kan `Sites.Selected`
> användas i stället – då måste en admin dessutom ge appen behörighet till
> siten via Graph. `Sites.ReadWrite.All` (delegerad) är enklast: användarna
> kommer ändå bara åt siter de själva redan har behörighet till.

### 2. Fyll i `src/config.ts`

```ts
clientId:     "<Application (client) ID>",
tenantId:     "<Directory (tenant) ID>",
siteHostname: "dittforetag.sharepoint.com",
sitePath:     "/sites/Flytten",          // sökvägen till er SharePoint-site
listName:     "Flyttlador",
```

### 3. SharePoint-listan

Listan behöver inte skapas i förväg: första gången appen körs mot en site
där listan saknas erbjuder den en knapp **”Skapa listan med rätt kolumner”**
som skapar den via Graph med kolumnerna:

| Kolumn | Typ |
|---|---|
| Title | Låd-ID (`BOX-001` …) |
| Innehall | Flerradig text |
| FranRum | Text |
| TillPlats | Text |
| Status | Val: Packad / I transport / Levererad / Uppackad |
| Omtaligt | Ja/Nej |

”Packad av” och ändringshistorik ges automatiskt av SharePoints inbyggda
*Skapad av*/versionshistorik.

### 4. Publicera på GitHub Pages

1. Skapa ett GitHub-repo och pusha koden till `main`.
2. I repot: **Settings → Pages → Source: GitHub Actions**.
3. Workflowen `.github/workflows/deploy.yml` bygger och deployar automatiskt
   vid varje push till `main`.
4. Lägg till den publika URL:en (`https://<konto>.github.io/<repo>/`) som
   SPA-redirect-URI i appregistreringen (steg 1.3).

## Lokal utveckling

```bash
npm install
npm run dev        # http://localhost:5173
```

## Etikettutskrift

- Förvalet passar **Avery 70×37 mm** (3×8 = 24 etiketter per A4-ark); mått,
  antal kolumner/rader och marginaler kan ändras i utskriftsvyn och sparas
  lokalt i webbläsaren.
- **”Börja på position”** låter dig återanvända ett delvis använt ark.
- I webbläsarens utskriftsdialog: välj **Marginaler: Ingen** och
  **Skala: 100 %** så hamnar etiketterna mm-exakt.
- QR-koden innehåller en länk till lådans sida i appen – skanna med mobilens
  kamera så öppnas innehållet direkt och status kan uppdateras på plats.
