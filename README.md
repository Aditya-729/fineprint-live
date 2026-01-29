# FinePrint Live

Simple web app that analyzes subscription cancellation and billing policies.

## What it does
- User pastes a URL and clicks Analyze
- App calls Mino once to gather policy text
- Deterministic rules set a verdict, flags, and explanations

## Supported use cases
- Subscription-based services (SaaS, streaming, courses, memberships)

Not intended for:
- One-time product purchases
- Social media platforms
- Government or banking sites

## Environment variables
Copy `.env.example` to `.env.local` and set:
```
MINO_API_URL=
MINO_API_KEY=
```

## Local development
```
npm install
npm run dev
```

## API response shape
`POST /api/analyze`
```
{
  "verdict": "good" | "caution" | "risk" | "unclear",
  "flags": string[],
  "explanations": string[]
}
```

## Mino response shape expected
```
{
  "productUrl": string,
  "productText": string,
  "policyPages": { "url": string, "text": string }[]
}
```
