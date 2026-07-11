import { getToken } from "./auth";
import { config } from "./config";
import { STATUSES, type Box, type BoxStatus } from "./types";

const GRAPH = "https://graph.microsoft.com/v1.0";

/** Kastas när listan inte finns på siten – appen erbjuder då att skapa den. */
export class ListMissingError extends Error {
  constructor() {
    super(`Listan "${config.listName}" finns inte på siten.`);
  }
}

interface GraphError extends Error {
  status?: number;
}

async function graph<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const url = path.startsWith("https://") ? path : GRAPH + path;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const err: GraphError = new Error(
      `Anropet mot Microsoft Graph misslyckades (${res.status}): ${body}`,
    );
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

let siteIdCache: string | null = null;
let listIdCache: string | null = null;

async function getSiteId(): Promise<string> {
  if (!siteIdCache) {
    const site = await graph<{ id: string }>(
      `/sites/${config.siteHostname}:${config.sitePath}`,
    );
    siteIdCache = site.id;
  }
  return siteIdCache;
}

async function getListId(): Promise<string> {
  if (!listIdCache) {
    const siteId = await getSiteId();
    const lists = await graph<{ value: { id: string; displayName: string }[] }>(
      `/sites/${siteId}/lists?$select=id,displayName&$top=500`,
    );
    const list = lists.value.find(
      (l) => l.displayName.toLowerCase() === config.listName.toLowerCase(),
    );
    if (!list) throw new ListMissingError();
    listIdCache = list.id;
  }
  return listIdCache;
}

/** Skapar SharePoint-listan med rätt kolumner (engångsuppsättning). */
export async function ensureList(): Promise<void> {
  const siteId = await getSiteId();
  const created = await graph<{ id: string }>(`/sites/${siteId}/lists`, {
    method: "POST",
    body: JSON.stringify({
      displayName: config.listName,
      list: { template: "genericList" },
      columns: [
        { name: "Innehall", text: { allowMultipleLines: true } },
        { name: "FranRum", text: {} },
        { name: "TillPlats", text: {} },
        {
          name: "Status",
          choice: {
            allowTextEntry: false,
            choices: [...STATUSES],
            displayAs: "dropDownMenu",
          },
        },
        { name: "Omtaligt", boolean: {} },
      ],
    }),
  });
  listIdCache = created.id;
}

interface SpItem {
  id: string;
  lastModifiedDateTime?: string;
  createdBy?: { user?: { displayName?: string } };
  fields?: Record<string, unknown>;
}

function toBox(item: SpItem): Box {
  const f = item.fields ?? {};
  const status = (STATUSES as readonly string[]).includes(String(f.Status))
    ? (f.Status as BoxStatus)
    : "Packad";
  return {
    itemId: item.id,
    title: String(f.Title ?? ""),
    innehall: String(f.Innehall ?? ""),
    franRum: String(f.FranRum ?? ""),
    tillPlats: String(f.TillPlats ?? ""),
    status,
    omtaligt: Boolean(f.Omtaligt),
    packadAv: item.createdBy?.user?.displayName ?? "",
    modified: item.lastModifiedDateTime ?? "",
  };
}

export async function listBoxes(): Promise<Box[]> {
  const siteId = await getSiteId();
  const listId = await getListId();
  const boxes: Box[] = [];
  let url: string | null =
    `${GRAPH}/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=500`;
  while (url) {
    const page: { value: SpItem[]; "@odata.nextLink"?: string } =
      await graph(url);
    for (const item of page.value) boxes.push(toBox(item));
    url = page["@odata.nextLink"] ?? null;
  }
  boxes.sort((a, b) => a.title.localeCompare(b.title, "sv", { numeric: true }));
  return boxes;
}

export interface BoxFields {
  title: string;
  innehall: string;
  franRum: string;
  tillPlats: string;
  status: BoxStatus;
  omtaligt: boolean;
}

function toSpFields(f: Partial<BoxFields>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.title !== undefined) out.Title = f.title;
  if (f.innehall !== undefined) out.Innehall = f.innehall;
  if (f.franRum !== undefined) out.FranRum = f.franRum;
  if (f.tillPlats !== undefined) out.TillPlats = f.tillPlats;
  if (f.status !== undefined) out.Status = f.status;
  if (f.omtaligt !== undefined) out.Omtaligt = f.omtaligt;
  return out;
}

export async function createBox(fields: BoxFields): Promise<void> {
  const siteId = await getSiteId();
  const listId = await getListId();
  await graph(`/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify({ fields: toSpFields(fields) }),
  });
}

export async function updateBox(
  itemId: string,
  fields: Partial<BoxFields>,
): Promise<void> {
  const siteId = await getSiteId();
  const listId = await getListId();
  await graph(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(toSpFields(fields)),
  });
}

export async function deleteBox(itemId: string): Promise<void> {
  const siteId = await getSiteId();
  const listId = await getListId();
  await graph(`/sites/${siteId}/lists/${listId}/items/${itemId}`, {
    method: "DELETE",
  });
}

/** Nästa lediga löpnummer, t.ex. "BOX-043". */
export function nextBoxId(boxes: Box[]): string {
  let max = 0;
  for (const b of boxes) {
    const m = /^BOX-(\d+)$/i.exec(b.title.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `BOX-${String(max + 1).padStart(3, "0")}`;
}
