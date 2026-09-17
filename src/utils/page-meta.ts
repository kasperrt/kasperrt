export type StructuredData = Record<string, unknown>;
type StructuredDataInput = StructuredData | StructuredData[] | undefined;
type MetaDate = Date | string | undefined;

export function siteUrl(path: string, site: URL | undefined, fallback = path) {
  if (!site) {
    return fallback;
  }
  return new URL(path, site).toString();
}

export function structuredDataList(data: StructuredDataInput): StructuredData[] {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [data];
}

export function optionalIsoDate(value: MetaDate) {
  if (!value) {
    return;
  }
  return new Date(value).toISOString();
}
