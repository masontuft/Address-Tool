const COLORS = ["#4f8ef7", "#f7c948", "#4caf6e", "#f05a5a"];

export default function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
  const color = COLORS[(name || "?").charCodeAt(0) % 4];

  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      fontSize: 16,
      flexShrink: 0,
      userSelect: "none",
    }}>
      {initials}
    </div>
  );
}
