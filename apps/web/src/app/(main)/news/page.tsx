export default function NewsPage() {
  return (
    <div className="pt-container">
      <div className="pt-page-header">
        <h1 className="pt-page-title">Market News</h1>
      </div>
      <div className="pt-card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Market News</h2>
        <p style={{ color: "var(--g400)", fontSize: 14 }}>Stay updated with the latest market news and analysis. Coming soon!</p>
      </div>
    </div>
  );
}
