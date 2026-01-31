import { buildExplanations } from "../../../lib/explain";
import { normalizeText, type MinoPayload } from "../../../lib/extract";
import { extractWithBrowser } from "../../../lib/headless";
import { callMino } from "../../../lib/mino";
import { analyzePolicies } from "../../../lib/rules";

export const dynamic = "force-dynamic";

type ApiResponse = {
  verdict: "good" | "caution" | "risk" | "unclear";
  flags: string[];
  explanations: string[];
};

type ActivityPayload = { message: string };
type LongStepPayload = { title: string };

const errorResponse = (flags: string[]): ApiResponse => {
  return {
    verdict: "unclear" as const,
    flags,
    explanations: buildExplanations(flags, "unclear"),
  };
};

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const parseRequestUrl = async (request: Request) => {
  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { url?: string };
      return typeof body.url === "string" ? body.url.trim() : "";
    } catch {
      return "";
    }
  }
  try {
    const parsed = new URL(request.url);
    return (parsed.searchParams.get("url") ?? "").trim();
  } catch {
    return "";
  }
};

const toClauseList = (payload: MinoPayload) => {
  const combined = normalizeText(
    [payload.productText, ...payload.policyPages.map((page) => page.text)].join(" "),
  );
  if (!combined) return [];
  return combined
    .split(/[.!?]\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export async function GET(request: Request) {
  return streamAnalyze(request);
}

export async function POST(request: Request) {
  return streamAnalyze(request);
}

const streamAnalyze = async (request: Request) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const sendActivity = (message: string) =>
        send("activity", { message } satisfies ActivityPayload);
      const sendLongStep = (title: string) =>
        send("long-step", { title } satisfies LongStepPayload);

      const endStream = (data: ApiResponse) => {
        send("done", data);
        closed = true;
        controller.close();
      };

      const abortHandler = () => {
        closed = true;
        try {
          controller.close();
        } catch {
          // Ignore close errors on aborted streams.
        }
      };

      request.signal.addEventListener("abort", abortHandler);

      try {
        sendActivity("Validating input URL");
        const url = await parseRequestUrl(request);
        if (!url || !isValidUrl(url)) {
          endStream(errorResponse(["invalid_url"]));
          return;
        }

        const withHeartbeat = async <T,>(title: string, task: () => Promise<T>) => {
          sendLongStep(title);
          const heartbeat = setInterval(() => {
            sendActivity(`Still working on: ${title}…`);
          }, 2000);
          try {
            return await task();
          } finally {
            clearInterval(heartbeat);
          }
        };

        let minoPayload: MinoPayload;
        try {
          sendActivity("Fetching main terms page");
          sendActivity("Discovering linked policy pages");
          minoPayload = await withHeartbeat("Reading policy pages", () =>
            callMino(url),
          );
        } catch (error) {
          console.error("Mino extraction failed", error);
          sendActivity("Switching to browser extraction");
          try {
            minoPayload = await withHeartbeat("Reading documents", () =>
              extractWithBrowser(url, sendActivity),
            );
          } catch (fallbackError) {
            console.error("Browser extraction failed", fallbackError);
            throw fallbackError;
          }
        }

        sendActivity("Extracting visible text");

        const policyPages = minoPayload.policyPages;
        for (let index = 0; index < policyPages.length; index += 1) {
          sendActivity(`Processing page ${index + 1} of ${policyPages.length}`);
        }

        sendActivity("Normalizing clauses");
        const clauses = toClauseList(minoPayload);

        sendActivity("Running clause detectors");
        if (clauses.length > 0) {
          sendLongStep("Scanning fine-print clauses");
          for (let index = 0; index < clauses.length; index += 1) {
            sendActivity(`Analyzing clause ${index + 1} of ${clauses.length}`);
          }
        }

        sendLongStep("Detecting risks");
        sendActivity("Classifying risks");
        const analysis = analyzePolicies(minoPayload.productText, minoPayload.policyPages);

        sendActivity("Generating final findings");
        const explanations = buildExplanations(analysis.flags, analysis.verdict);

        endStream({
          verdict: analysis.verdict,
          flags: analysis.flags,
          explanations,
        });
      } catch {
        endStream(errorResponse(["analysis_failed"]));
      } finally {
        request.signal.removeEventListener("abort", abortHandler);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
