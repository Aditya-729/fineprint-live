"use client";

import { useEffect, useRef, useState } from "react";

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
  const [activity, setActivity] = useState<{ id: string; message: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: string; title: string; emoji: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [showIdle, setShowIdle] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const onAnalyze = async () => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    setLoading(true);
    setResult(null);
    setActivity([]);
    setToasts([]);
    setStreaming(true);
    setLastEventAt(Date.now());
    setShowIdle(false);

    const streamUrl = `/api/analyze-stream?url=${encodeURIComponent(url)}`;
    const source = new EventSource(streamUrl);
    sourceRef.current = source;

    const bumpActivity = (message: string) => {
      setLastEventAt(Date.now());
      setActivity((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, message },
      ]);
    };

    const pushToast = (title: string) => {
      setLastEventAt(Date.now());
      const emoji = title.toLowerCase().includes("reading")
        ? "📄"
        : title.toLowerCase().includes("scanning")
          ? "🔎"
          : title.toLowerCase().includes("detecting")
            ? "⚠️"
            : "🧠";
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, title, emoji }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 3000);
    };

    source.addEventListener("activity", (event) => {
      try {
        const data = JSON.parse(event.data) as { message?: string };
        if (typeof data.message === "string") {
          bumpActivity(data.message);
        }
      } catch {
        // Ignore malformed activity payloads.
      }
    });

    source.addEventListener("long-step", (event) => {
      try {
        const data = JSON.parse(event.data) as { title?: string };
        if (typeof data.title === "string") {
          pushToast(data.title);
        }
      } catch {
        // Ignore malformed long-step payloads.
      }
    });

    source.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data) as AnalyzeResult;
        setResult(isAnalyzeResult(data) ? data : fallbackResult);
      } catch {
        setResult(fallbackResult);
      } finally {
        source.close();
        sourceRef.current = null;
        setLoading(false);
        setStreaming(false);
      }
    });

    source.onerror = () => {
      setResult(fallbackResult);
      source.close();
      sourceRef.current = null;
      setLoading(false);
      setStreaming(false);
    };
  };

  useEffect(() => {
    if (!streaming) {
      setShowIdle(false);
      return;
    }
    const interval = window.setInterval(() => {
      if (!lastEventAt) return;
      setShowIdle(Date.now() - lastEventAt > 3000);
    }, 500);
    return () => window.clearInterval(interval);
  }, [streaming, lastEventAt]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
    };
  }, []);

  return (
    <main className="page">
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span className="toast-emoji" aria-hidden>
              {toast.emoji}
            </span>
            <div>
              <p className="toast-title">{toast.title}</p>
              <p className="toast-subtitle">Hang tight — this can take a moment.</p>
            </div>
          </div>
        ))}
      </div>
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

      <div className="panel activity-panel">
        <div className="panel-header">
          <h2>Activity</h2>
          {streaming && <span className="panel-pill">Live</span>}
        </div>
        {activity.length === 0 ? (
          <p className="muted">Progress updates will appear here.</p>
        ) : (
          <ul className="activity-list">
            {activity.map((entry) => (
              <li key={entry.id} className="activity-item">
                {entry.message}
              </li>
            ))}
          </ul>
        )}
        {streaming && showIdle && (
          <div className="idle-indicator">Working…</div>
        )}
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
          padding: 48px 20px 120px;
          display: grid;
          gap: 28px;
          align-content: start;
          color: #0b0b0c;
          background: #f6f6f2;
          font-family: "Helvetica Neue", "Arial", sans-serif;
          letter-spacing: 0.01em;
          position: relative;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.035) 0 1px,
            transparent 1px 6px
          );
          opacity: 0.15;
          pointer-events: none;
        }

        .toast-stack {
          position: fixed;
          top: 20px;
          right: 20px;
          display: grid;
          gap: 12px;
          z-index: 5;
        }

        .toast {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
          animation: toastIn 200ms ease both;
          color: #121212;
          min-width: 240px;
          max-width: 320px;
        }

        .toast-emoji {
          font-size: 20px;
        }

        .toast-title {
          margin: 0;
          font-weight: 600;
        }

        .toast-subtitle {
          margin: 2px 0 0;
          font-size: 12px;
          color: #5a5a5a;
        }

        .hero {
          position: relative;
          z-index: 1;
          animation: intro 600ms ease both;
        }

        .hero h1 {
          margin: 0 0 6px;
          font-size: 40px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .helper {
          margin: 0;
          color: #4b4b4b;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
        }

        .panel {
          position: relative;
          z-index: 1;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.06);
          animation: intro 420ms ease both;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .panel-pill {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          padding: 4px 10px;
          border-radius: 999px;
          color: #1a1a1a;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(0, 0, 0, 0.03);
        }

        .activity-panel {
          min-height: 160px;
        }

        .activity-list {
          list-style: none;
          padding: 0;
          margin: 8px 0 0;
          display: grid;
          gap: 10px;
        }

        .activity-item {
          padding: 10px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          color: #1a1a1a;
          letter-spacing: 0.02em;
          animation: slideFadeIn 200ms ease both;
        }

        .idle-indicator {
          margin-top: 10px;
          font-size: 13px;
          color: #6a6a6a;
          animation: idlePulse 1.4s ease-in-out infinite;
        }

        label {
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
          color: #111;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
        }

        input[type="url"] {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: #fafafa;
          color: #111;
          font-size: 15px;
          transition: transform 180ms ease, box-shadow 200ms ease, border-color 200ms ease;
        }

        input[type="url"]:focus {
          outline: none;
          transform: translateY(-1px);
          border-color: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
        }

        .button {
          margin-top: 14px;
          width: 100%;
          padding: 12px 18px;
          border: 1px solid #111;
          border-radius: 12px;
          background: #111;
          color: #f7f7f7;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-size: 12px;
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 200ms ease, opacity 200ms ease,
            background 200ms ease, color 200ms ease;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
        }

        .button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #ffffff;
          color: #111;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
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
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 12px;
          transition: background 200ms ease, box-shadow 200ms ease, color 200ms ease;
          animation: popIn 300ms ease;
        }

        .verdict.good {
          color: #0b7d2a;
          background: rgba(16, 185, 129, 0.12);
          box-shadow: none;
        }

        .verdict.caution {
          color: #a15d00;
          background: rgba(245, 158, 11, 0.12);
          box-shadow: none;
        }

        .verdict.risk {
          color: #b42318;
          background: rgba(244, 63, 94, 0.12);
          box-shadow: none;
        }

        .verdict.unclear {
          color: #3f3f3f;
          background: rgba(148, 163, 184, 0.16);
          box-shadow: none;
        }

        h2 {
          margin: 12px 0 6px;
          font-size: 14px;
          color: #0f0f0f;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }

        .muted {
          color: #707070;
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
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.2);
          color: #111;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          animation: chipIn 360ms ease both;
        }

        .flag-detail {
          display: grid;
          gap: 6px;
          padding: 12px 12px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: none;
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
          color: #2d2d2d;
          font-size: 14px;
          line-height: 1.45;
        }

        .explanations {
          margin: 6px 0 0;
          padding-left: 18px;
          color: #2b2b2b;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes idlePulse {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
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
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
          }
          50% {
            box-shadow: 0 14px 26px rgba(0, 0, 0, 0.3);
          }
        }

        @media (min-width: 768px) {
          .page {
            padding: 64px 28px 140px;
            max-width: 880px;
            margin: 0 auto;
          }

          .hero h1 {
            font-size: 52px;
          }

          .toast-stack {
            top: 32px;
            right: 32px;
          }
        }
      `}</style>
    </main>
  );
}
