import { useState } from "react";
import Avatar from "./Avatar";

function CopyBtn({ text, label = "Copy", style = {} }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={copy}
      style={{
        padding: "2px 8px",
        fontSize: 11,
        borderRadius: 5,
        border: "1px solid #ddd",
        background: copied ? "#e8f5e9" : "#f5f5f5",
        cursor: "pointer",
        color: copied ? "#4caf6e" : "#555",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function AddressCard({ entry, onDelete }) {
  const fields = [
    { label: "Street", value: entry.street },
    { label: "City", value: entry.city },
    { label: "State", value: entry.state },
    { label: "ZIP", value: entry.zip },
    { label: "Country", value: entry.country },
  ].filter(f => f.value);

  const singleLine = [entry.street, entry.city, entry.state, entry.zip, entry.country]
    .filter(Boolean)
    .join(", ");

  const multiLine = [
    entry.name,
    entry.label,
    entry.street,
    [entry.city, entry.state, entry.zip].filter(Boolean).join(", "),
    entry.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{
      border: "1px solid #e8e8e8",
      borderRadius: 12,
      padding: 18,
      background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={entry.name} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.name}</div>
            {entry.label && <div style={{ fontSize: 13, color: "#888" }}>{entry.label}</div>}
          </div>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          title="Delete"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#ccc", padding: 4, lineHeight: 1 }}
        >
          🗑
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 14 }}>
        <tbody>
          {fields.map(f => (
            <tr key={f.label}>
              <td style={{ color: "#999", paddingRight: 10, paddingBottom: 5, width: 64, verticalAlign: "top", fontSize: 13 }}>{f.label}</td>
              <td style={{ paddingBottom: 5, verticalAlign: "top" }}>{f.value}</td>
              <td style={{ paddingBottom: 5, verticalAlign: "top", textAlign: "right" }}>
                <CopyBtn text={f.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{
        background: "#f7f8fa",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}>
        <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#444" }}>
          {multiLine}
        </pre>
        <CopyBtn text={singleLine} label="Copy" style={{ marginTop: 2, flexShrink: 0 }} />
      </div>
    </div>
  );
}
