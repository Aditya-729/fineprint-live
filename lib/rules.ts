import { normalizeText, type PolicyPage } from "./extract";

export type Verdict = "good" | "caution" | "risk" | "unclear";

export type Analysis = {
  verdict: Verdict;
  flags: string[];
};

const AUTO_RENEW = /auto[-\s]?renew|recurring|charged monthly|charged annually|billed monthly|billed annually|renews automatically/i;
const NO_REFUNDS = /no refunds|non-refundable|nonrefundable|all sales final|not eligible for refund/i;
const CANCEL_ANYTIME = /cancel anytime|cancel at any time/i;

export const analyzePolicies = (
  productText: string,
  policyPages: PolicyPage[],
): Analysis => {
  const normalizedProduct = normalizeText(productText);
  const normalizedPolicy = normalizeText(
    policyPages.map((page) => page.text).join(" "),
  );
  const combined = `${normalizedProduct} ${normalizedPolicy}`;

  const flagSet = new Set<string>();

  const autoRenew = AUTO_RENEW.test(combined);
  const noRefunds = NO_REFUNDS.test(combined);
  const conflict =
    CANCEL_ANYTIME.test(normalizedProduct) && NO_REFUNDS.test(normalizedPolicy);
  const missingPolicyText =
    policyPages.length === 0 || normalizedPolicy.length === 0;
  // Only mark unclear when missing data and no risky signals were found.
  const unclear = !autoRenew && !noRefunds && !conflict && missingPolicyText;

  if (autoRenew) flagSet.add("auto_renew");
  if (noRefunds) flagSet.add("no_refunds");
  if (conflict) flagSet.add("conflict");
  if (unclear) flagSet.add("unclear");

  const verdict: Verdict =
    conflict || noRefunds ? "risk" : autoRenew || unclear ? "caution" : "good";

  const flags = Array.from(flagSet);
  return { verdict, flags };
};
