// One subgraph per chain, composed at query time (per docs/PARTNERS.md's
// Graph section) — there is no single endpoint that already spans every
// chain, so every consumer fans out to all configured URLs and merges.
const SUBGRAPH_URLS = (process.env.NEXT_PUBLIC_SUBGRAPH_URLS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter((url) => url.length > 0);

export function hasSubgraphs(): boolean {
  return SUBGRAPH_URLS.length > 0;
}

export async function querySubgraphs<T>(query: string): Promise<T[]> {
  const results = await Promise.allSettled(
    SUBGRAPH_URLS.map(async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`Subgraph at ${url} returned ${response.status}`);
      const body = (await response.json()) as { data?: T; errors?: unknown };
      if (!body.data) throw new Error(`Subgraph at ${url} returned no data`);
      return body.data;
    }),
  );

  const fulfilled: T[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") fulfilled.push(result.value);
  }

  // Only throw if every configured subgraph failed — one unreachable chain
  // should degrade the merged result, not blank the whole page.
  if (fulfilled.length === 0 && SUBGRAPH_URLS.length > 0) {
    throw new Error("All configured subgraphs failed to respond");
  }

  return fulfilled;
}
