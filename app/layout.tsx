import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FinePrint Live",
  description: "Understand cancellation and billing terms fast.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <style>{`
          :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            line-height: 1.5;
          }
          body {
            margin: 0;
            background: #f7f7f7;
            color: #111;
          }
          main {
            max-width: 720px;
            margin: 0 auto;
            padding: 24px 16px 64px;
          }
          h1 {
            font-size: 28px;
            margin: 8px 0 4px;
          }
          p {
            margin: 8px 0;
          }
          .card {
            background: #fff;
            border: 1px solid #e6e6e6;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }
          label {
            font-weight: 600;
            display: block;
            margin-bottom: 8px;
          }
          input[type="url"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #cfcfcf;
            border-radius: 10px;
            font-size: 16px;
          }
          button {
            margin-top: 12px;
            padding: 10px 16px;
            border: 0;
            border-radius: 10px;
            background: #111;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
          }
          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .helper {
            color: #555;
            font-size: 14px;
          }
          .result {
            margin-top: 16px;
          }
          .verdict {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .verdict.good { background: #e7f7ec; color: #14532d; }
          .verdict.caution { background: #fff7e6; color: #7c4a03; }
          .verdict.risk { background: #fde8e8; color: #7f1d1d; }
          .verdict.unclear { background: #eef2ff; color: #312e81; }
          ul {
            padding-left: 18px;
            margin: 8px 0;
          }
        `}</style>
      </body>
    </html>
  );
}
