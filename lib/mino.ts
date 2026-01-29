import type { MinoPayload } from "./extract";

const DEFAULT_TIMEOUT_MS = 240000;

const buildGoal = (url: string) =>
  [
    `Visit ${url} and identify cancellation, billing, refund, or subscription policies.`,
    "Find policy links containing: terms, refund, cancel, billing, subscription.",
    "Extract readable text from the main page and any policy pages found.",
    "Return JSON with productUrl, productText, and policyPages (url + text).",
  ].join(" ");

const extractPayload = (value: unknown) => {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("resultJson" in record) return record.resultJson;
    if ("data" in record) return record.data;
    if ("result" in record) {
      const inner = record.result;
      if (inner && typeof inner === "object" && "result" in (inner as Record<string, unknown>)) {
        return (inner as Record<string, unknown>).result;
      }
      return inner;
    }
    if ("output" in record) return record.output;
  }
  return value;
};

const hasRequiredFields = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.productText === "string" && Array.isArray(record.policyPages);
};

const extractFromSse = (text: string) => {
  let last: unknown = null;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const chunk = line.slice(5).trim();
    if (!chunk) continue;
    try {
      const parsed = JSON.parse(chunk);
      const payload = extractPayload(parsed);
      if (hasRequiredFields(payload)) {
        last = payload;
      }
    } catch {
      continue;
    }
  }
  return last;
};

const readSseStream = async (response: Response) => {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data:")) continue;
      const chunk = part.slice(5).trim();
      if (!chunk) continue;
      try {
        const parsed = JSON.parse(chunk);
        const payload = extractPayload(parsed);
        if (hasRequiredFields(payload)) {
          await reader.cancel();
          return payload;
        }
      } catch {
        continue;
      }
    }
  }
  return extractFromSse(buffer);
};

export async function callMino(url: string): Promise<MinoPayload> {
  const apiUrl = process.env.MINO_API_URL;
  const apiKey = process.env.MINO_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("Missing MINO_API_URL or MINO_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        url,
        goal: buildGoal(url),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Mino request failed");
    }

    let data: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("text/event-stream")) {
        if (response.body && "getReader" in response.body) {
          data = await readSseStream(response);
        } else {
          const text = await response.text();
          data = extractFromSse(text);
        }
      } else {
        data = await response.json();
      }
    } catch {
      throw new Error("Mino request failed");
    }

    const payload = extractPayload(data);

    if (!payload || typeof payload !== "object") {
      throw new Error("Mino request failed");
    }

    const record = payload as Record<string, unknown>;
    if (typeof record.productText !== "string") {
      throw new Error("Mino request failed");
    }
    if (!Array.isArray(record.policyPages)) {
      throw new Error("Mino request failed");
    }

    const policyPages = record.policyPages
      .map((page) => {
        if (!page || typeof page !== "object") return null;
        const pageRecord = page as Record<string, unknown>;
        if (typeof pageRecord.url !== "string") return null;
        if (typeof pageRecord.text !== "string") return null;
        return { url: pageRecord.url, text: pageRecord.text };
      })
      .filter((page): page is { url: string; text: string } => Boolean(page));

    return {
      productUrl:
        typeof record.productUrl === "string" ? record.productUrl : url,
      productText: record.productText,
      policyPages,
    };
  } catch {
    throw new Error("Mino request failed");
  } finally {
    clearTimeout(timeout);
  }
}
