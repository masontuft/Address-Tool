import { useState, useRef, useEffect } from "react";
import { parseCSVText, mapRow } from "./utils/csvParser";
import { findAllDuplicates, isExactMatch } from "./utils/duplicates";
import { loadAddresses, insertAddresses, deleteAddress, deleteAddresses, updateAddress, upsertAllAddresses } from "./utils/supabase";
import AddressCard from "./components/AddressCard";
import DuplicateModal from "./components/DuplicateModal";
import ManualForm from "./components/ManualForm";

function btnStyle(bg) {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  };
}

export default function App() {
  const [addresses, setAddresses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  // pendingRef stores the combined list and which ids are newly incoming (not yet in DB)
  const pendingRef = useRef({ allAddresses: [], incomingIds: new Set() });

  useEffect(() => {
    loadAddresses()
      .then(data => {
        setAddresses(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load addresses: " + err.message);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id) {
    setAddresses(prev => prev.filter(a => a.id !== id));
    try {
      await deleteAddress(id);
    } catch (err) {
      setError("Delete failed: " + err.message);
    }
  }

  async function processIncoming(incoming) {
    const combined = [...addresses, ...incoming];
    const dups = findAllDuplicates(combined);

    // Auto-remove the incoming entry for any exact match — no user input needed
    const autoRemove = new Set(
      dups.filter(d => isExactMatch(d.existing, d.incoming)).map(d => d.incoming.id)
    );
    const manualDups = dups.filter(d => !isExactMatch(d.existing, d.incoming));
    const filteredCombined = combined.filter(a => !autoRemove.has(a.id));
    const filteredIncoming = incoming.filter(a => !autoRemove.has(a.id));

    if (manualDups.length > 0) {
      pendingRef.current = {
        allAddresses: filteredCombined,
        incomingIds: new Set(filteredIncoming.map(e => e.id)),
      };
      setConflicts(manualDups);
    } else {
      setAddresses(filteredCombined);
      try {
        await insertAddresses(filteredIncoming);
      } catch (err) {
        setError("Save failed: " + err.message);
      }
    }
  }

  async function handleUpdate(entry) {
    setAddresses(prev => prev.map(a => a.id === entry.id ? entry : a));
    try {
      await updateAddress(entry);
    } catch (err) {
      setError("Update failed: " + err.message);
    }
  }

  async function handleResolve(decisions) {
    const { allAddresses, incomingIds } = pendingRef.current;
    const dups = findAllDuplicates(allAddresses);

    const toRemove = new Set();
    dups.forEach((conflict, i) => {
      const choice = decisions[i];
      if (choice === "existing") toRemove.add(conflict.incoming.id);
      else if (choice === "incoming") toRemove.add(conflict.existing.id);
    });

    const seen = new Set();
    const result = allAddresses.filter(a => {
      if (toRemove.has(a.id)) return false;
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    setAddresses(result);
    setConflicts(null);

    // Existing entries that lost — delete from DB
    const existingToDelete = [...toRemove].filter(id => !incomingIds.has(id));
    // Incoming entries that won — insert into DB
    const incomingToInsert = result.filter(a => incomingIds.has(a.id));

    try {
      await Promise.all([
        deleteAddresses(existingToDelete),
        insertAddresses(incomingToInsert),
      ]);
    } catch (err) {
      setError("Save failed: " + err.message);
    }
  }

  async function handleCSV(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const all = [];
    for (const file of files) {
      const text = await file.text();
      const rows = parseCSVText(text).map(mapRow);
      rows.forEach(r => { if (r.name || r.street) all.push(r); });
    }
    if (all.length) processIncoming(all);
  }

  async function handleFileDoc(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setLoadingMsg("Extracting addresses with AI…");
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const mediaType = file.type || (file.type.startsWith("image/") ? "image/jpeg" : "application/pdf");
      const key = import.meta.env.VITE_GEMINI_API_KEY;

      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text:
                    "Extract all names and addresses from the provided file. " +
                    "Return ONLY a raw JSON array with no markdown fences or explanation. " +
                    "Each object must have these fields: name, street, city, state, zip, country, label. " +
                    "Use empty string for any missing field.",
                }],
              },
              contents: [{
                parts: [
                  { inlineData: { mimeType: mediaType, data: base64 } },
                  { text: "Extract all addresses." },
                ],
              }],
            }),
          }
        );

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const match = text.match(/\[[\s\S]*\]/);
        const parsed = match ? JSON.parse(match[0]) : [];
        const entries = parsed.map(r => ({ ...r, id: crypto.randomUUID() }));
        processIncoming(entries);
      } catch (err) {
        setError("Failed to extract addresses: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
        setLoadingMsg("");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleExport() {
    const header = "name,label,street,city,state,zip,country";
    const esc = v => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = addresses.map(a =>
      [a.name, a.label, a.street, a.city, a.state, a.zip, a.country].map(esc).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "addresses.csv";
    a.click();
  }

  async function handleSaveAll() {
    if (!addresses.length) return;
    setSaving(true);
    try {
      await upsertAllAddresses(addresses);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err) {
      setError("Save all failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleManualSave(entry) {
    processIncoming([entry]);
    setManualOpen(false);
  }

  const filtered = search.trim()
    ? addresses.filter(a =>
        [a.name, a.street, a.city, a.state, a.zip, a.country]
          .some(v => (v || "").toLowerCase().includes(search.toLowerCase()))
      )
    : addresses;

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: 14,
        fontFamily: "system-ui, sans-serif",
        color: "#555",
      }}>
        <div style={{ fontSize: 32 }}>⏳</div>
        <div>{loadingMsg || "Loading…"}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "28px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Address Book</h1>
      <p style={{ margin: "0 0 20px", color: "#888", fontSize: 14 }}>
        {addresses.length} {addresses.length === 1 ? "entry" : "entries"}
      </p>

      {error && (
        <div style={{
          background: "#fff0f0", border: "1px solid #fcc", borderRadius: 8,
          padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#c00",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c00", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by name, street, city, state, ZIP…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            fontSize: 14,
            outline: "none",
          }}
        />
        <label style={btnStyle("#4f8ef7")}>
          Import CSV
          <input type="file" accept=".csv" multiple hidden onChange={handleCSV} />
        </label>
        <label style={btnStyle("#6c5ce7")}>
          Import PDF / Image
          <input type="file" accept=".pdf,image/*" hidden onChange={handleFileDoc} />
        </label>
        <button onClick={() => setManualOpen(o => !o)} style={btnStyle("#4caf6e")}>
          {manualOpen ? "Cancel" : "Add Manually"}
        </button>
        {addresses.length > 0 && (
          <button onClick={handleExport} style={btnStyle("#888")}>Export CSV</button>
        )}
        {addresses.length > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={btnStyle(savedMsg ? "#4caf6e" : "#e67e22")}
          >
            {saving ? "Saving…" : savedMsg ? "Saved ✓" : "Save All"}
          </button>
        )}
      </div>

      {manualOpen && (
        <ManualForm onSave={handleManualSave} onCancel={() => setManualOpen(false)} />
      )}

      {filtered.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", marginTop: 64, fontSize: 15 }}>
          {addresses.length === 0
            ? "No addresses yet — import a CSV, a PDF, or add one manually."
            : "No results for that search."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map(entry => (
          <AddressCard
            key={entry.id}
            entry={entry}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {conflicts && (
        <DuplicateModal conflicts={conflicts} onResolve={handleResolve} />
      )}
    </div>
  );
}
