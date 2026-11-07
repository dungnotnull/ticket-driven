"use client";

/**
 * Last-resort boundary when the root layout itself crashes (CSS/shell load).
 * Must render its own <html>/<body> per Next.js requirement.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#fbfbfd",
          color: "#14161b",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>The app failed to start</h1>
          <p style={{ fontSize: 13, color: "#616b78", marginTop: 8 }}>
            {error.message || "A critical error occurred. Reloading usually fixes it."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #d5d8e0",
              background: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
