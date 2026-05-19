import Avatar from "./Avatar";

export default function MiniCard({ entry, selected, onClick, label }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? "2px solid #4f8ef7" : "2px solid #e0e0e0",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        position: "relative",
        flex: 1,
        minWidth: 0,
        background: selected ? "#f0f6ff" : "#fff",
        transition: "border-color 0.15s",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 10,
          color: "#4f8ef7",
          fontWeight: 700,
          fontSize: 18,
        }}>✓</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Avatar name={entry.name} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>
          {entry.label && <div style={{ fontSize: 12, color: "#888" }}>{entry.label}</div>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
        {entry.street && <div>{entry.street}</div>}
        <div>{[entry.city, entry.state, entry.zip].filter(Boolean).join(", ")}</div>
        {entry.country && <div>{entry.country}</div>}
      </div>
      {label && (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "#999",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
