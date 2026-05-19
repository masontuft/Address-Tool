import { useState } from "react";

const empty = { name: "", label: "", street: "", city: "", state: "", zip: "", country: "" };

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 7,
  border: "1px solid #ddd",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle = {
  fontSize: 13,
  color: "#555",
  marginBottom: 4,
  display: "block",
  fontWeight: 500,
};

export default function ManualForm({ onSave, onCancel }) {
  const [form, setForm] = useState(empty);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, id: crypto.randomUUID() });
    setForm(empty);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Add Address</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Name *</label>
          <input required style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Label</label>
          <input style={inputStyle} value={form.label} onChange={e => set("label", e.target.value)} placeholder="e.g. company, family" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Street *</label>
          <input required style={inputStyle} value={form.street} onChange={e => set("street", e.target.value)} placeholder="123 Main St" />
        </div>
        <div>
          <label style={labelStyle}>City</label>
          <input style={inputStyle} value={form.city} onChange={e => set("city", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>State</label>
          <input style={inputStyle} value={form.state} onChange={e => set("state", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ZIP</label>
          <input style={inputStyle} value={form.zip} onChange={e => set("zip", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input style={inputStyle} value={form.country} onChange={e => set("country", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 14 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#4f8ef7", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
        >
          Save
        </button>
      </div>
    </form>
  );
}
