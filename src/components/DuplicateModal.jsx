import { useState } from "react";
import MiniCard from "./MiniCard";

export default function DuplicateModal({ conflicts, onResolve }) {
  const [step, setStep] = useState(0);
  const [decisions, setDecisions] = useState({});

  const conflict = conflicts[step];
  const decision = decisions[step];
  const allResolved = conflicts.every((_, i) => decisions[i] !== undefined);

  function pick(choice) {
    setDecisions(d => ({ ...d, [step]: choice }));
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 14,
        padding: 28,
        width: "min(580px, 95vw)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Duplicate Detected</h2>
        <p style={{ margin: "0 0 20px", color: "#666", fontSize: 14 }}>
          Conflict {step + 1} of {conflicts.length} — choose which entry to keep.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <MiniCard
            entry={conflict.existing}
            selected={decision === "existing"}
            onClick={() => pick("existing")}
            label="Existing"
          />
          <MiniCard
            entry={conflict.incoming}
            selected={decision === "incoming"}
            onClick={() => pick("incoming")}
            label="New"
          />
        </div>

        <button
          onClick={() => pick("both")}
          style={{
            width: "100%",
            padding: "9px 0",
            marginBottom: 22,
            border: decision === "both" ? "2px solid #4f8ef7" : "2px solid #e0e0e0",
            borderRadius: 8,
            background: decision === "both" ? "#eef4ff" : "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: decision === "both" ? "#4f8ef7" : "#555",
            transition: "all 0.15s",
          }}
        >
          Keep Both
        </button>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
          {conflicts.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === step ? "#4f8ef7" : decisions[i] !== undefined ? "#cce0ff" : "#ddd",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: step === 0 ? "not-allowed" : "pointer",
              color: step === 0 ? "#bbb" : "#333",
              fontSize: 14,
            }}
          >
            Back
          </button>
          {step < conflicts.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#4f8ef7", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => onResolve(decisions)}
              disabled={!allResolved}
              style={{
                padding: "8px 18px",
                borderRadius: 7,
                border: "none",
                background: allResolved ? "#4caf6e" : "#ccc",
                color: "#fff",
                cursor: allResolved ? "pointer" : "not-allowed",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
