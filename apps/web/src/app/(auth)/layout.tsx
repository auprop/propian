export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "var(--g50)",
      }}
    >
      <div className="pt-auth-wrap">{children}</div>
    </div>
  );
}
