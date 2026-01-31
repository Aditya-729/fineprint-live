import chromium from "@sparticuz/chromium";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-core";
import { normalizeText, type MinoPayload, type PolicyPage } from "./extract";

type ProgressReporter = (message: string) => void;

const MAX_TEXT_LENGTH = 12000;
const MAX_POLICY_PAGES = 6;
const POLICY_KEYWORDS = [
  "terms",
  "policy",
  "privacy",
  "refund",
  "cancel",
  "billing",
  "subscription",
  "faq",
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const truncateText = (value: string) =>
  value.length <= MAX_TEXT_LENGTH ? value : value.slice(0, MAX_TEXT_LENGTH);

const toAbsoluteUrl = (href: string, baseUrl: string) => {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
};

const isLikelyPolicyLink = (href: string, text: string) => {
  const haystack = `${href} ${text}`.toLowerCase();
  return POLICY_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

const extractTextFromHtml = (html: string) => {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const text = normalizeText($("body").text());
  return truncateText(text);
};

const discoverPolicyLinks = (baseUrl: string, html: string) => {
  const $ = cheerio.load(html);
  const baseOrigin = new URL(baseUrl).origin;
  const links = new Map<string, string>();

  $("a").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = $(element).text();
    if (!href || !isLikelyPolicyLink(href, text)) return;
    const absolute = toAbsoluteUrl(href, baseUrl);
    if (!absolute) return;
    if (absolute.startsWith("mailto:") || absolute.startsWith("tel:")) return;
    const parsed = new URL(absolute);
    if (parsed.origin !== baseOrigin) return;
    const normalized = absolute.replace(/\/+$/, "");
    if (!links.has(normalized)) {
      links.set(normalized, absolute);
    }
  });

  return Array.from(links.values()).slice(0, MAX_POLICY_PAGES);
};

const launchBrowser = async () => {
  const executablePath =
    (await chromium.executablePath()) || process.env.PUPPETEER_EXECUTABLE_PATH;

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
};

const fetchHtmlWithBrowser = async (browser: puppeteer.Browser, url: string) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    return await page.content();
  } finally {
    await page.close();
  }
};

export const extractWithBrowser = async (
  url: string,
  report?: ProgressReporter,
): Promise<MinoPayload> => {
  report?.("Launching headless browser");
  const browser = await launchBrowser();
  try {
    const mainHtml = await fetchHtmlWithBrowser(browser, url);
    report?.("Extracting text from main page");
    const productText = extractTextFromHtml(mainHtml);

    report?.("Discovering linked policy pages");
    const policyUrls = discoverPolicyLinks(url, mainHtml);

    const policyPages: PolicyPage[] = [];
    for (let index = 0; index < policyUrls.length; index += 1) {
      const policyUrl = policyUrls[index];
      report?.(`Processing page ${index + 1} of ${policyUrls.length}`);
      const html = await fetchHtmlWithBrowser(browser, policyUrl);
      const text = extractTextFromHtml(html);
      if (text) {
        policyPages.push({ url: policyUrl, text });
      }
    }

    return {
      productUrl: url,
      productText,
      policyPages,
    };
  } finally {
    await browser.close();
  }
};
