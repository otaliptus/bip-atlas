export type FigureViewValues = Record<string, string | null | undefined>;

const prefixFor = (figureId: string): string => {
  const id = figureId.replace(/^fig-/, "");
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid figure id ${figureId}`);
  return `${id}.`;
};

export function figureViewQuery(figureId: string, values: FigureViewValues): string {
  const prefix = prefixFor(figureId);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value != null && value !== "") params.set(`${prefix}${key}`, value);
  return params.toString();
}

export function readFigureView(search: string, figureId: string): Record<string, string> {
  const prefix = prefixFor(figureId);
  const values: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.startsWith(prefix) && key.length > prefix.length) values[key.slice(prefix.length)] = value;
  }
  return values;
}

export function figureShareUrl(href: string, figureId: string, values: FigureViewValues): string {
  const url = new URL(href);
  const prefix = prefixFor(figureId);
  for (const key of [...url.searchParams.keys()]) if (key.startsWith(prefix)) url.searchParams.delete(key);
  const query = figureViewQuery(figureId, values);
  for (const [key, value] of new URLSearchParams(query)) url.searchParams.append(key, value);
  url.hash = figureId;
  return url.toString();
}
