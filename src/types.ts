export const STATUSES = [
  "Packad",
  "I transport",
  "Levererad",
  "Uppackad",
] as const;

export type BoxStatus = (typeof STATUSES)[number];

export interface Box {
  /** SharePoint-listobjektets id (används vid uppdatering/borttagning) */
  itemId: string;
  /** Låd-ID, t.ex. "BOX-042" (Title-kolumnen) */
  title: string;
  innehall: string;
  franRum: string;
  tillPlats: string;
  status: BoxStatus;
  omtaligt: boolean;
  packadAv: string;
  modified: string;
}

/** URL:en som QR-koden på etiketten pekar på. */
export function boxUrl(title: string): string {
  return `${window.location.origin}${window.location.pathname}#/box/${encodeURIComponent(title)}`;
}
