import { useState, useRef, useEffect } from "react";
import { parseCSVText, mapRow } from "./utils/csvParser";
import { findAllDuplicates, isExactMatch } from "./utils/duplicates";
import { loadAddresses, insertAddresses, deleteAddress, deleteAddresses, updateAddress, upsertAllAddresses } from "./utils/supabase";
import { verifyAddress } from "./utils/addressVerification";
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

const KEEP_BOTH_KEY = "keepBothMemory";

function pairKey(a, b) {
  const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  return [norm(a.name), norm(b.name)].sort().join("|");
}

function loadKeepBothMemory() {
  try { return new Set(JSON.parse(localStorage.getItem(KEEP_BOTH_KEY) || "[]")); }
  catch { return new Set(); }
}

function saveKeepBothMemory(mem) {
  localStorage.setItem(KEEP_BOTH_KEY, JSON.stringify([...mem]));
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
  const [verifyingIds, setVerifyingIds] = useState(new Set());
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  // pendingRef stores the combined list and which ids are newly incoming (not yet in DB)
  const pendingRef = useRef({ allAddresses: [], incomingIds: new Set() });
  const keepBothMemory = useRef(loadKeepBothMemory());

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
    const nonExact = dups.filter(d => !isExactMatch(d.existing, d.incoming));
    // Auto-resolve pairs the user previously chose to keep both
    const manualDups = nonExact.filter(d => !keepBothMemory.current.has(pairKey(d.existing, d.incoming)));

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

  function fieldsDiffer(entry, corrected) {
    if (!corrected) return false;
    const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
    return ["street", "city", "state", "zip", "country"].some(
      f => corrected[f] && norm(corrected[f]) !== norm(entry[f])
    );
  }

  async function handleUpdate(entry) {
    const { id, name, street, city, state, zip, country, label, tags } = entry;
    const fields = { name, street, city, state, zip, country, label, tags: tags || [], verified: "unverified", formatted_address: null, corrected_fields: null, verified_at: null };
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    try {
      await updateAddress(id, fields);
    } catch (err) {
      setError("Update failed: " + err.message);
    }
  }

  async function handlePatchEntry(id, patch) {
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
    try {
      await updateAddress(id, patch);
    } catch (err) {
      setError("Update failed: " + err.message);
    }
  }

  async function handleVerify(id) {
    setVerifyingIds(prev => new Set([...prev, id]));
    try {
      const entry = addresses.find(a => a.id === id);
      if (!entry) return;
      const result = await verifyAddress(entry);
      const corrected = fieldsDiffer(entry, result.corrected) ? result.corrected : null;
      const patch = {
        verified: result.status,
        formatted_address: result.formattedAddress,
        corrected_fields: corrected,
        verified_at: new Date().toISOString(),
      };
      setAddresses(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
      await updateAddress(id, patch);
    } catch (err) {
      setError("Verification failed: " + err.message);
    } finally {
      setVerifyingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function handleVerifyAll() {
    setVerifyingAll(true);
    try {
      await Promise.all(addresses.map(a => handleVerify(a.id)));
    } finally {
      setVerifyingAll(false);
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
      else if (choice === "both") {
        const key = pairKey(conflict.existing, conflict.incoming);
        if (!keepBothMemory.current.has(key)) {
          keepBothMemory.current.add(key);
          saveKeepBothMemory(keepBothMemory.current);
        }
      }
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
    const header = "name,label,street,city,state,zip,country,tags";
    const esc = v => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = filtered.map(a =>
      [a.name, a.label, a.street, a.city, a.state, a.zip, a.country, (a.tags || []).join(";")].map(esc).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const el = document.createElement("a");
    el.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    el.download = selectedTag ? `${selectedTag}.csv` : "addresses.csv";
    el.click();
  }

  async function handleExportDoc() {
    const { jsPDF } = await import("jspdf");
    const title = selectedTag || "Addresses";

    // ── Page geometry (all inches, measured from source PDF at 300 DPI) ──────
    //   top margin    1.000"  (first text top at 1.0" from page edge)
    //   L/R margin    0.625"  (col 1 text starts at 0.625" from left)
    //   bottom margin 0.500"
    //   col slots     2.625" | 2.625" | 2.000"  (sum = 7.25" usable)
    //   col text starts at:  0.625"  |  3.250"  |  5.875"
    //   row height    1.000" fixed  (3 × 12pt lines = 0.500" text + 0.500" gap)
    //   font          Times-Roman 12pt, single-spaced (line height = 12/72 = 0.1667")
    //   cap height    0.662 × 12pt / 72 = 0.110"  (baseline offset from text top)
    const PAGE_W = 8.5, PAGE_H = 11.0;
    const MT = 1.0, ML = 0.625, MB = 0.5;
    // Left edge of each column slot (for centering calculations)
    const COL_X = [ML, ML + 2.625, ML + 5.25];   // [0.625, 3.250, 5.875]
    // Center x of each column slot — text is centered within the slot
    const COL_CX = [ML + 1.3125, ML + 3.9375, ML + 6.25]; // [1.9375, 4.5625, 6.875]
    const ROW_H  = 1.0;
    const FONT_PT = 12;
    const LINE_H  = FONT_PT / 72;                 // 0.1667" between baselines
    const CAP_H   = (FONT_PT * 0.662) / 72;       // 0.110" — Times-Roman cap height

    const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [PAGE_W, PAGE_H] });
    doc.setFont("times", "normal");
    doc.setFontSize(FONT_PT);

    // rowBase = baseline y of the first text line in the current grid row
    let rowBase = MT + CAP_H;

    for (let i = 0; i < filtered.length; i += 3) {
      if (i > 0 && rowBase > PAGE_H - MB) {
        doc.addPage([PAGE_W, PAGE_H]);
        rowBase = MT + CAP_H;
      }

      for (let col = 0; col < 3; col++) {
        const a = filtered[i + col];
        if (!a) continue;
        const cx = COL_CX[col];
        let y = rowBase;

        doc.text(a.name || "", cx, y, { align: "center" });

        if (a.street) {
          y += LINE_H;
          doc.text(a.street, cx, y, { align: "center" });
        }

        const cityLine = [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : "");
        if (cityLine.trim()) {
          y += LINE_H;
          doc.text(cityLine, cx, y, { align: "center" });
        }
      }

      rowBase += ROW_H;
    }

    doc.save(`${title}.pdf`);
  }

  async function handleExportLabels() {
    const { jsPDF } = await import("jspdf");
    const title = selectedTag || "Addresses";

    // ── Staples 2.625" × 1" 30-up label sheet (measured from template PDF at 300 DPI) ──
    //   top margin   0.500"  (row 1 top at 150px/300dpi)
    //   left margin  0.150"  (col 1 left at 45px/300dpi)
    //   label width  2.623"  (832-45 px / 300dpi) ≈ 2.625"
    //   label height 1.000"  (300px / 300dpi)
    //   col gap      0.160"  (880-832 px / 300dpi)
    //   row gap      0.000"  (rows share borders, no vertical gap)
    //   cols × rows  3 × 10 = 30 labels per page
    //   col centers  1.4617" | 4.2450" | 7.0283"
    const PAGE_W = 8.5, PAGE_H = 11.0;
    const LABEL_W = 2.6233, LABEL_H = 1.0;
    const LEFT   = 0.150, TOP = 0.500, COL_GAP = 0.160;

    const COL_CX = [
      LEFT + LABEL_W / 2,                          // 1.4617"
      LEFT + LABEL_W + COL_GAP + LABEL_W / 2,      // 4.2450"
      LEFT + 2 * (LABEL_W + COL_GAP) + LABEL_W / 2, // 7.0283"
    ];

    // 9pt Times-Roman fits 3 address lines comfortably in a 1" label
    const FONT_PT = 9;
    const LINE_H  = FONT_PT / 72;               // 0.125" between baselines
    const CAP_H   = (FONT_PT * 0.662) / 72;     // 0.083" — Times-Roman cap height

    const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [PAGE_W, PAGE_H] });
    doc.setFont("times", "normal");
    doc.setFontSize(FONT_PT);

    filtered.forEach((a, idx) => {
      const posOnPage = idx % 30;
      if (posOnPage === 0 && idx > 0) doc.addPage([PAGE_W, PAGE_H]);

      const row = Math.floor(posOnPage / 3);
      const col = posOnPage % 3;
      const labelTop = TOP + row * LABEL_H;
      const cx = COL_CX[col];

      const lines = [a.name || ""];
      if (a.street) lines.push(a.street);
      const cityLine = [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : "");
      if (cityLine.trim()) lines.push(cityLine);

      // Vertically center the text block within the label
      const blockH = (lines.length - 1) * LINE_H + CAP_H;
      const firstBaseline = labelTop + (LABEL_H - blockH) / 2 + CAP_H;

      lines.forEach((line, i) => {
        doc.text(line, cx, firstBaseline + i * LINE_H, { align: "center" });
      });
    });

    doc.save(`${title}-labels.pdf`);
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

  const allTags = [...new Set(addresses.flatMap(a => a.tags || []))].sort();
  const tagCounts = Object.fromEntries(allTags.map(tag => [tag, addresses.filter(a => (a.tags || []).includes(tag)).length]));

  const filtered = addresses.filter(a => {
    const matchesSearch = !search.trim() || [a.name, a.street, a.city, a.state, a.zip, a.country]
      .some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    const matchesTag = !selectedTag || (a.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

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
          <button onClick={handleExport} style={btnStyle("#888")}>
            {selectedTag ? `Export "${selectedTag}"` : "Export CSV"}
          </button>
        )}
        {addresses.length > 0 && (
          <button onClick={handleExportDoc} style={btnStyle("#888")}>
            {selectedTag ? `Export "${selectedTag}" Doc` : "Export Doc"}
          </button>
        )}
        {addresses.length > 0 && (
          <button onClick={handleExportLabels} style={btnStyle("#888")}>
            {selectedTag ? `Export "${selectedTag}" Labels` : "Export Labels"}
          </button>
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
        {addresses.length > 0 && (
          <button
            onClick={handleVerifyAll}
            disabled={verifyingAll || verifyingIds.size > 0}
            style={btnStyle("#2980b9")}
          >
            {verifyingAll ? "Verifying…" : "Verify All"}
          </button>
        )}
      </div>

      {manualOpen && (
        <ManualForm onSave={handleManualSave} onCancel={() => setManualOpen(false)} />
      )}

      {allTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#aaa", marginRight: 2 }}>Groups:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(t => t === tag ? null : tag)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: `1px solid ${selectedTag === tag ? "#4f8ef7" : "#ddd"}`,
                background: selectedTag === tag ? "#e8f0fe" : "#f5f5f5",
                color: selectedTag === tag ? "#4f8ef7" : "#555",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: selectedTag === tag ? 600 : 400,
              }}
            >
              {tag} <span style={{ opacity: 0.6, fontWeight: 400, marginLeft: 3 }}>{tagCounts[tag]}</span>
            </button>
          ))}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              style={{ padding: "4px 8px", borderRadius: 20, border: "none", background: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}
            >
              Clear
            </button>
          )}
        </div>
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
            onVerify={handleVerify}
            onPatch={handlePatchEntry}
            verifying={verifyingIds.has(entry.id)}
            allTags={allTags}
          />
        ))}
      </div>

      {conflicts && (
        <DuplicateModal conflicts={conflicts} onResolve={handleResolve} />
      )}
    </div>
  );
}
