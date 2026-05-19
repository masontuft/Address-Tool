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

const inputStyle = {
  width: "100%",
  padding: "6px 9px",
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

export default function AddressCard({ entry, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  function startEdit() {
    setForm({ ...entry });
    setEditing(true);
  }

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  function handleSave() {
    onUpdate(form);
    setEditing(false);
  }

  const cardStyle = {
    border: "1px solid #e8e8e8",
    borderRadius: 12,
    padding: 18,
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  if (editing) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Avatar name={form.name} />
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="Name"
            style={{ ...inputStyle, fontWeight: 700, fontSize: 15 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>Label</label>
            <input value={form.label || ""} onChange={e => set("label", e.target.value)} placeholder="e.g. company, family" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>Street</label>
            <input value={form.street || ""} onChange={e => set("street", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>City</label>
            <input value={form.city || ""} onChange={e => set("city", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>State</label>
            <input value={form.state || ""} onChange={e => set("state", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>ZIP</label>
            <input value={form.zip || ""} onChange={e => set("zip", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 3 }}>Country</label>
            <input value={form.country || ""} onChange={e => set("country", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setEditing(false)}
            style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "#4f8ef7", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const fields = [
    { label: "Street", value: entry.street },
    { label: "City", value: entry.city },
    { label: "State", value: entry.state },
    { label: "ZIP", value: entry.zip },
    { label: "Country", value: entry.country },
  ].filter(f => f.value);

  const multiLine = [
    entry.name,
    entry.street,
    [entry.city, entry.state, entry.zip].filter(Boolean).join(", "),
    entry.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={entry.name} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.name}</div>
            {entry.label && <div style={{ fontSize: 13, color: "#888" }}>{entry.label}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={startEdit}
            title="Edit"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#bbb", padding: 4, lineHeight: 1 }}
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            title="Delete"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#bbb", padding: 4, lineHeight: 1 }}
          >
            🗑
          </button>
        </div>
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
        <CopyBtn text={multiLine} style={{ marginTop: 2, flexShrink: 0 }} />
      </div>
    </div>
  );
}
