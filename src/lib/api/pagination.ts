export async function collectAllUniquePages<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  identify: (item: T) => string | number,
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string | number>();
  let offset = 0;

  for (;;) {
    const page = await fetchPage(pageSize, offset);
    let added = 0;

    for (const item of page) {
      const id = identify(item);
      if (!seen.has(id)) {
        seen.add(id);
        items.push(item);
        added += 1;
      }
    }

    if (page.length === 0 || added === 0) {
      return items;
    }
    offset += page.length;
  }
}
