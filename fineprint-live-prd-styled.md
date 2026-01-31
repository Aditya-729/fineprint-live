# FinePrint Live — Product Requirements
Document (PRD)

Overview
FinePrint Live is a minimal, consumer-focused tool that analyzes a subscription
or service URL to help users understand cancellation and billing terms. It
uses a single Mino call for extraction and deterministic rules for a clear
verdict with readable flags and explanations.

System Preview
1. Goal (Subscription Clarity Flow)
FinePrint Live acts as a rule-based policy analyzer for subscription services.
It extracts policy text, detects signals like auto-renewal or no-refund terms,
and returns a single verdict with concise explanations.

Trust Flow
Phase 	Action
URL INTAKE 	Accept one URL from the user
PAGE EXTRACTION 	Use Mino to fetch product text + policy pages
RULE SCAN 	Detect auto-renew, no-refund, conflict, unclear
VERDICT + DETAILS 	Return verdict, flags, explanations

Output Schema

{
  "verdict": "good | caution | risk | unclear",
  "flags": ["auto_renew", "no_refunds", "conflict", "unclear"],
  "explanations": ["Readable explanations of flags"]
}

2. Code Snippets
cURL
curl -X POST "https://fineprint-live.vercel.app/api/analyze" \
-H "Content-Type: application/json" \
-d '{"url":"https://example.com/pricing"}'

TypeScript (Frontend Usage)
const response = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
});
const data = await response.json();
setResult(data);

Python (SDK Usage)
import requests
def analyze_site(url):
    payload = {"url": url}
    response = requests.post("https://fineprint-live.vercel.app/api/analyze", json=payload)
    data = response.json()
    print("Verdict:", data["verdict"])
    print("Flags:", data["flags"])
analyze_site("https://example.com/pricing")

3. Operational Signals
FinePrint Live keeps analysis deterministic and returns only:
- verdict
- flags
- explanations

Key Features
Feature 	Description
Single-Action UI 	One URL input → one verdict
Deterministic Rules 	No AI generation, only keyword/regex rules
Transparent Output 	Flags + explanations in plain language
Premium UI 	Dark, glowing, glassmorphic interface

Architecture Overview
Component Relationships
Component 	Role
app/page.tsx 	Frontend UI + animations
app/api/analyze/route.ts 	API route for analysis
lib/mino.ts 	Mino agent call + response parsing
lib/extract.ts 	Mino response normalization
lib/rules.ts 	Rule-based verdict logic
lib/explain.ts 	Flag explanations

System Architecture Diagram

User URL Input
/api/analyze
Mino Agent Fetch
Product Text + Policy Pages
Rules Scan
Verdict + Flags + Explanations
UI Result

Data Flow Diagram
"Rules Engine"	"Mino Agent"	"/api/analyze"	"FinePrint Live UI"	User
Paste URL + Analyze
POST { url }
Fetch product + policy pages
productText + policyPages
Detect flags
verdict + flags + explanations
Result displayed

System Vision
FinePrint Live should become a simple, trusted helper for subscription clarity:
Deterministic: Rule-based, predictable outputs
Minimal UX: One input → one verdict
Risk visibility: Highlight auto-renewal and refund restrictions
Premium brand: UI feels modern, calm, and reliable
