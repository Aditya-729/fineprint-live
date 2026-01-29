"use client";

import { useState } from "react";

type AnalyzeResult = {
  verdict: "good" | "caution" | "risk" | "unclear";
  flags: string[];
  explanations: string[];
};

const fallbackResult: AnalyzeResult = {
  verdict: "unclear",
  flags: ["analysis_failed"],
  explanations: [
    "The analysis could not complete due to a request or parsing error.",
  ],
};

const isAnalyzeResult = (value: unknown): value is AnalyzeResult => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const verdict =
    record.verdict === "good" ||
    record.verdict === "caution" ||
    record.verdict === "risk" ||
    record.verdict === "unclear";
  const flags = Array.isArray(record.flags) && record.flags.every((f) => typeof f === "string");
  const explanations =
    Array.isArray(record.explanations) &&
    record.explanations.every((e) => typeof e === "string");
  return verdict && flags && explanations;
};

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const onAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        setResult(fallbackResult);
        return;
      }
      const data = await response.json();
      // Guard against malformed responses to avoid UI crashes.
      setResult(isAnalyzeResult(data) ? data : fallbackResult);
    } catch {
      setResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="hero">
        <h1>FinePrint Live</h1>
        <p className="helper">
          Works best for subscription apps, online services, and memberships.
        </p>
      </div>
      <div className="panel">
        <label htmlFor="url">Website URL</label>
        <input
          id="url"
          type="url"
          placeholder="https://example.com/pricing (enter a URL to check pricing)"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button
          className={loading ? "button loading" : "button"}
          onClick={onAnalyze}
          disabled={loading || !url}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {result && (
        <div className="panel result">
          <div className={`verdict ${result.verdict}`}>
            {result.verdict}
          </div>
          <h2>Flags</h2>
          {result.flags.length === 0 ? (
            <p className="muted">No flags detected.</p>
          ) : (
            <ul className="flag-detail-list">
              {result.flags.map((flag, index) => (
                <li key={flag} className="flag-detail">
                  <span className="flag">{flag}</span>
                  <span className="flag-note">
                    {result.explanations[index] ?? "No details available."}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {result.flags.length === 0 && (
            <>
              <h2>Explanations</h2>
              <ul className="explanations">
                {result.explanations.map((text, index) => (
                  <li key={`${text}-${index}`}>{text}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 32px 16px 80px;
          display: grid;
          gap: 22px;
          align-content: start;
          color: #eef1ff;
          background: linear-gradient(135deg, #2c0f6b, #6016a2, #1d5cff, #20b8ff);
          background-size: 300% 300%;
          animation: gradientShift 18s ease infinite;
          position: relative;
          overflow: hidden;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.1), transparent 40%),
            radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.08), transparent 35%),
            repeating-linear-gradient(120deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 6px);
          opacity: 0.25;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: shimmer 12s ease-in-out infinite;
        }

        .hero {
          position: relative;
          z-index: 1;
          animation: intro 600ms ease both;
        }

        .hero h1 {
          margin: 0 0 6px;
          font-size: 34px;
          letter-spacing: -0.03em;
          text-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        .helper {
          margin: 0;
          color: #d2d7ff;
        }

        .panel {
          position: relative;
          z-index: 1;
          background: linear-gradient(160deg, rgba(18, 22, 44, 0.88), rgba(10, 14, 30, 0.7));
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 15px 50px rgba(4, 6, 20, 0.5),
            0 0 30px rgba(90, 120, 255, 0.25);
          backdrop-filter: blur(16px);
          animation: intro 700ms ease both;
        }

        label {
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
          color: #f1f3ff;
        }

        input[type="url"] {
          width: 100%;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid transparent;
          background: rgba(6, 8, 22, 0.8);
          color: #f7f7ff;
          font-size: 16px;
          box-shadow: inset 0 0 0 1px rgba(120, 150, 255, 0.35);
          transition: transform 180ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }

        input[type="url"]:focus {
          outline: none;
          transform: scale(1.01);
          border-color: rgba(140, 170, 255, 0.9);
          box-shadow: 0 0 0 3px rgba(125, 160, 255, 0.35),
            0 0 22px rgba(90, 120, 255, 0.6);
        }

        .button {
          margin-top: 14px;
          width: 100%;
          padding: 12px 18px;
          border: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, #74f0ff, #9b6bff, #ff5cc8);
          background-size: 200% 200%;
          color: #0b0f1a;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 200ms ease, opacity 200ms ease;
          box-shadow: 0 0 30px rgba(120, 130, 255, 0.5);
        }

        .button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(120, 130, 255, 0.7);
        }

        .button:active:not(:disabled) {
          transform: translateY(1px) scale(0.99);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button.loading {
          animation: pulse 1.2s ease-in-out infinite;
        }

        .result {
          animation: riseIn 450ms ease both;
        }

        .verdict {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 12px;
          transition: background 200ms ease, box-shadow 200ms ease, color 200ms ease;
          animation: popIn 300ms ease;
        }

        .verdict.good {
          color: #9bffd1;
          background: rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 22px rgba(16, 185, 129, 0.6);
        }

        .verdict.caution {
          color: #ffe7a6;
          background: rgba(245, 158, 11, 0.22);
          box-shadow: 0 0 22px rgba(245, 158, 11, 0.6);
        }

        .verdict.risk {
          color: #ffc1d1;
          background: rgba(244, 63, 94, 0.25);
          box-shadow: 0 0 22px rgba(244, 63, 94, 0.6);
        }

        .verdict.unclear {
          color: #d6ddff;
          background: rgba(148, 163, 184, 0.2);
          box-shadow: 0 0 22px rgba(148, 163, 184, 0.5);
        }

        h2 {
          margin: 12px 0 6px;
          font-size: 16px;
          color: #eef0ff;
        }

        .muted {
          color: #c0c7e6;
        }

        .flag-detail-list {
          list-style: none;
          padding: 0;
          margin: 8px 0 12px;
          display: grid;
          gap: 10px;
        }

        .flag {
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(120, 130, 255, 0.2);
          border: 1px solid rgba(120, 130, 255, 0.45);
          color: #e4e8ff;
          font-size: 13px;
          box-shadow: 0 0 16px rgba(120, 130, 255, 0.35);
          animation: chipIn 360ms ease both;
        }

        .flag-detail {
          display: grid;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(8, 12, 28, 0.6);
          border: 1px solid rgba(120, 130, 255, 0.2);
          box-shadow: inset 0 0 0 1px rgba(120, 130, 255, 0.08);
          animation: chipIn 360ms ease both;
        }

        .flag-detail:nth-child(1) {
          animation-delay: 40ms;
        }

        .flag-detail:nth-child(2) {
          animation-delay: 80ms;
        }

        .flag-detail:nth-child(3) {
          animation-delay: 120ms;
        }

        .flag-detail:nth-child(4) {
          animation-delay: 160ms;
        }

        .flag-note {
          color: #cfd5f3;
          font-size: 14px;
          line-height: 1.45;
        }

        .explanations {
          margin: 6px 0 0;
          padding-left: 18px;
          color: #d3d8f4;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.35;
          }
        }

        @keyframes intro {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes chipIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 0 30px rgba(120, 130, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 46px rgba(120, 130, 255, 0.8);
          }
        }

        @media (min-width: 768px) {
          .page {
            padding: 48px 24px 96px;
            max-width: 720px;
            margin: 0 auto;
          }

          .hero h1 {
            font-size: 42px;
          }
        }
      `}</style>
    </main>
  );
}
