import { NextResponse } from "next/server";
import { callMino } from "../../../lib/mino";
import { analyzePolicies } from "../../../lib/rules";
import { buildExplanations } from "../../../lib/explain";

type ApiResponse = {
  verdict: "good" | "caution" | "risk" | "unclear";
  flags: string[];
  explanations: string[];
};

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

export async function POST(request: Request) {
  let response: ApiResponse = errorResponse(["analysis_failed"]);
  try {
    let body: { url?: string } = {};
    try {
      body = (await request.json()) as { url?: string };
    } catch {
      response = errorResponse(["invalid_url"]);
      return NextResponse.json(response);
    }
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!url || !isValidUrl(url)) {
      response = errorResponse(["invalid_url"]);
      return NextResponse.json(response);
    }

    const minoPayload = await callMino(url);
    const analysis = analyzePolicies(
      minoPayload.productText,
      minoPayload.policyPages,
    );
    const explanations = buildExplanations(analysis.flags, analysis.verdict);

    response = {
      verdict: analysis.verdict,
      flags: analysis.flags,
      explanations,
    };
  } catch {
    response = errorResponse(["analysis_failed"]);
  }
  return NextResponse.json(response);
}
