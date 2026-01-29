import type { Verdict } from "./rules";

const FLAG_EXPLANATIONS: Record<string, string> = {
  auto_renew:
    "Auto-renewing language means charges can repeat until you cancel. Pricing can change between billing cycles or after trials end, so it is important to check renewal terms and how cancellation is handled.",
  no_refunds:
    "No-refund language means charges may be final even if you cancel quickly. This can affect trial conversions or early cancellations, and it often means the price paid will not be reversed.",
  conflict:
    "We found a mismatch between marketing language and policy text. That can signal different rules depending on where you look, which makes billing outcomes harder to predict.",
  unclear:
    "Cancellation or billing terms were missing or too vague to confirm. When policies are unclear, pricing changes or renewal rules can still apply without obvious notice.",
  analysis_failed:
    "The analysis could not complete. The site may be bot-protected, heavily scripted, or blocking automated access. Try a simpler public URL or a different page on the same site.",
  invalid_url: "Enter a valid website URL to analyze.",
};

const DEFAULT_EXPLANATION =
  "No common risk signals were detected in the available pages.";

export const buildExplanations = (flags: string[], verdict: Verdict) => {
  const explanations = flags
    .map((flag) => FLAG_EXPLANATIONS[flag])
    .filter(Boolean);

  if (explanations.length === 0) {
    if (verdict === "good") {
      return [DEFAULT_EXPLANATION];
    }
    return ["No clear policy signals were found."];
  }

  return explanations;
};
