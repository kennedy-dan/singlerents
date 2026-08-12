type PageLoaderProps = {
  label?: string;
};

export default function PageLoader({ label = "Loading…" }: PageLoaderProps) {
  return (
    <main
      className="page"
      aria-busy="true"
      aria-live="polite"
      style={{ minHeight: 360, display: "grid", placeContent: "center", justifyItems: "center", gap: 12 }}
    >
      <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="none" stroke="#dce3dd" strokeWidth="3" />
        <path d="M15 3a12 12 0 0 1 12 12" fill="none" stroke="#eb7556" strokeWidth="3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 15 15" to="360 15 15" dur=".7s" repeatCount="indefinite" />
        </path>
      </svg>
      <p className="muted">{label}</p>
    </main>
  );
}
