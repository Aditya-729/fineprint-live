export type PolicyPage = { url: string; text: string };

export type MinoPayload = {
  productUrl: string;
  productText: string;
  policyPages: PolicyPage[];
};

const MAX_TEXT_LENGTH = 12000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toStringOrEmpty = (value: unknown) =>
  typeof value === "string" ? value : "";

export const normalizeText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const truncateText = (value: string) => {
  // Defensive truncation keeps payloads bounded and predictable.
  if (value.length <= MAX_TEXT_LENGTH) return value;
  return value.slice(0, MAX_TEXT_LENGTH);
};

const normalizeUrlKey = (value: string) =>
  value.trim().toLowerCase().replace(/\/+$/, "");

const coercePayload = (value: unknown): MinoPayload | null => {
  if (!isRecord(value)) {
    return null;
  }

  const productUrl = toStringOrEmpty(value.productUrl).trim();
  const productText = truncateText(toStringOrEmpty(value.productText).trim());
  const policyPagesRaw = Array.isArray(value.policyPages)
    ? value.policyPages
    : [];

  const deduped = new Map<string, PolicyPage>();
  for (const page of policyPagesRaw) {
    if (!isRecord(page)) {
      continue;
    }
    const url = toStringOrEmpty(page.url).trim();
    const text = truncateText(toStringOrEmpty(page.text).trim());
    if (!url || !text) {
      continue;
    }
    const key = normalizeUrlKey(url);
    if (!deduped.has(key)) {
      deduped.set(key, { url, text });
    }
  }

  const policyPages = Array.from(deduped.values());

  if (!productUrl || !productText) {
    return null;
  }

  return { productUrl, productText, policyPages };
};

export const parseMinoResponse = (raw: unknown): MinoPayload | null => {
  let candidate: unknown = raw;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  if (isRecord(candidate)) {
    if ("data" in candidate) {
      candidate = candidate.data;
    } else if ("result" in candidate) {
      candidate = candidate.result;
    } else if ("output" in candidate) {
      candidate = candidate.output;
    }
  }

  return coercePayload(candidate);
};
