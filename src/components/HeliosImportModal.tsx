import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg0: "#07090D", bg1: "#0C1018", bg2: "#111820", bg3: "#18222E", bg4: "#1E2C3A",
  border0: "#1C2A38", border1: "#243650",
  text0: "#E2EAF4", text1: "#6B88A8", text2: "#344F6A",
  blue:   { bg: "#0F2744", border: "#1D4ED8", text: "#60A5FA", dot: "#3B82F6" },
  green:  { bg: "#0A2818", border: "#15803D", text: "#4ADE80", dot: "#22C55E" },
  orange: { bg: "#2A1A08", border: "#C2410C", text: "#FB923C", dot: "#F97316" },
  red:    { bg: "#2A0A0A", border: "#B91C1C", text: "#FCA5A5", dot: "#EF4444" },
  purple: { bg: "#1A1030", border: "#7C3AED", text: "#C4B5FD", dot: "#8B5CF6" },
};

// ─── HÉLIOS FIELD MAP ─────────────────────────────────────────────────────────
const HELIOS_MAP: Record<string, string> = {
  "NUM_OF": "order_id", "N° OF": "order_id", "N°OF": "order_id",
  "NUMERO_OF": "order_id", "OF": "order_id", "N° ORDRE": "order_id",
  "REF_ARTICLE": "part_number", "REFERENCE": "part_number", "REF ARTICLE": "part_number",
  "ARTICLE": "part_number", "CODE ARTICLE": "part_number",
  "DESIGNATION": "part_name", "DÉSIGNATION": "part_name", "LIBELLE": "part_name",
  "LIBELLÉ": "part_name", "DESCRIPTION": "part_name",
  "QTE_LANCEE": "quantity", "QTE LANCÉE": "quantity", "QUANTITE": "quantity",
  "QUANTITÉ": "quantity", "QTE": "quantity", "QTÉ LANCÉE": "quantity",
  "DATE_DEBUT_PREV": "start_date", "DATE DÉBUT PREV": "start_date",
  "DATE DE DÉBUT": "start_date", "DATE LANCEMENT": "start_date",
  "DATE_FIN_PREV": "deadline", "DATE FIN PREV": "deadline",
  "DATE DE FIN": "deadline", "DATE BESOIN": "deadline", "DEADLINE": "deadline",
  "PRIORITE": "priority", "PRIORITÉ": "priority", "PRIO": "priority",
  "CLIENT": "customer", "NOM_CLIENT": "customer", "CODE CLIENT": "customer",
  "NOM CLIENT": "customer",
  "FAMILLE": "family", "SOUS_FAMILLE": "sub_family", "SOUS-FAMILLE": "sub_family",
  "STATUT_OF": "status", "STATUT": "status", "ETAT": "status", "ÉTAT": "status",
  "GAMME": "routing", "CODE_GAMME": "routing", "GAMME OP": "routing",
  "LIGNE": "line", "SECTION": "section", "ATELIER": "workshop",
};

// ─── NORMALIZER ───────────────────────────────────────────────────────────────
function normalizeRow(rawRow: any, index: number) {
  const normalized: any = { _raw: rawRow, _index: index, _errors: [], _warnings: [] };

  for (const [rawKey, value] of Object.entries(rawRow)) {
    const cleanKey = rawKey?.toString().trim().toUpperCase().replace(/\s+/g, " ");
    const mapped = HELIOS_MAP[cleanKey];
    if (mapped) normalized[mapped] = value?.toString().trim() ?? "";
    else normalized[`_unknown_${cleanKey}`] = value;
  }

  if (!normalized.order_id) normalized._errors.push("Missing order ID (NUM_OF)");
  if (!normalized.part_number) normalized._errors.push("Missing part reference (REF_ARTICLE)");
  if (!normalized.deadline) normalized._warnings.push("No deadline specified");
  if (!normalized.customer) normalized._warnings.push("No customer assigned");

  for (const dateField of ["start_date", "deadline"]) {
    if (normalized[dateField]) {
      const d = parseHeliosDate(normalized[dateField]);
      if (d) normalized[dateField] = d;
      else normalized._warnings.push(`Unreadable date format in ${dateField}: "${normalized[dateField]}"`);
    }
  }

  if (normalized.priority) {
    const p = normalized.priority.toString().toUpperCase();
    if (["1", "H", "HIGH", "HAUTE", "URGENT"].includes(p)) normalized.priority = "HIGH";
    else if (["2", "M", "MEDIUM", "NORMALE", "NORMAL"].includes(p)) normalized.priority = "MEDIUM";
    else if (["3", "L", "LOW", "BASSE", "FAIBLE"].includes(p)) normalized.priority = "LOW";
  } else {
    normalized.priority = "MEDIUM";
  }

  if (normalized.status) {
    const s = normalized.status.toString().toUpperCase();
    if (["EN COURS", "LANCÉ", "LANCE", "IN_PROGRESS"].includes(s)) normalized.status = "active";
    else if (["CLO", "CLOS", "CLOSED", "TERMINÉ"].includes(s)) normalized.status = "complete";
    else if (["ANN", "ANNULÉ", "CANCELLED"].includes(s)) normalized.status = "cancelled";
    else normalized.status = "scheduled";
  } else {
    normalized.status = "scheduled";
  }

  normalized._valid = normalized._errors.length === 0;
  return normalized;
}

function parseHeliosDate(val: any) {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split("T")[0];
  }
  const s = val.toString().trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2,"0")}-${fr[1].padStart(2,"0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Tag = ({ color, label }: { color: any, label: string }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
    padding: "2px 7px", borderRadius: 4,
    background: color.bg, border: `1px solid ${color.border}`,
    color: color.text, textTransform: "uppercase", whiteSpace: "nowrap",
  }}>{label}</span>
);

const PriorityTag = ({ p }: { p: string }) => {
  const map: Record<string, any> = { HIGH: C.red, MEDIUM: C.orange, LOW: C.blue };
  return <Tag color={map[p] || C.blue} label={p || "—"} />;
};

const StatusTag = ({ s }: { s: string }) => {
  const map: Record<string, any> = { active: C.green, complete: C.blue, cancelled: C.red, scheduled: C.purple };
  return <Tag color={map[s] || C.purple} label={s || "—"} />;
};

const Step = ({ n, label, active, done }: { n: string, label: string, active: boolean, done: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{
      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700,
      background: done ? C.green.bg : active ? C.blue.bg : C.bg3,
      border: `1.5px solid ${done ? C.green.border : active ? C.blue.border : C.border0}`,
      color: done ? C.green.text : active ? C.blue.text : C.text2,
    }}>
      {done ? "✓" : n}
    </div>
    <span style={{
      fontSize: 12, fontWeight: active || done ? 600 : 400,
      color: done ? C.green.text : active ? C.text0 : C.text2,
    }}>{label}</span>
  </div>
);

const Divider = ({ active }: { active: boolean }) => (
  <div style={{ width: 32, height: 1.5, borderRadius: 2, background: active ? C.blue.border : C.border0 }} />
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HeliosImportModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [stage, setStage] = useState("idle");
  const [fileName, setFileName] = useState("");
  const [rawBlob, setRawBlob] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [normalized, setNormalized] = useState<any[]>([]);
  const [queued, setQueued] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [tab, setTab] = useState("valid");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setStage("dropped");
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setHeaders(rows.length ? Object.keys(rows[0] as object) : []);
      setRawBlob(rows as any[]);
      setStage("parsed");
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const runNormalize = () => {
    setStage("normalizing");
    setTimeout(() => {
      if (!rawBlob) return;
      const result = rawBlob.map((row, i) => normalizeRow(row, i));
      setNormalized(result);
      setStage("done");
    }, 600);
  };

  const enqueueValid = () => {
    const valid = normalized.filter(r => r._valid && r.status !== "cancelled" && r.status !== "complete");
    setQueued(valid);
    setTab("queued");
  };

  const valid   = normalized.filter(r => r._valid);
  const invalid = normalized.filter(r => !r._valid);
  const warns   = normalized.filter(r => r._valid && r._warnings.length > 0);

  const displayRows = tab === "valid"   ? valid
                    : tab === "invalid" ? invalid
                    : tab === "queued"  ? queued
                    : normalized;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#07090D] border border-[#1C2A38] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* TOP BAR */}
          <div style={{
            background: C.bg1, borderBottom: `1px solid ${C.border0}`,
            padding: "0 28px", height: 60, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: C.blue.bg, border: `1px solid ${C.blue.border}40`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>✈</div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.text0 }}>AeroFab</span>
                <span style={{ color: C.text2, fontSize: 13 }}> / Hélios Import Pipeline</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text1 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green.dot }} />
                Ingestion Service Online
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-md text-[#6B88A8] hover:text-[#E2EAF4] hover:bg-[#1E2C3A] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {/* PIPELINE STEPS */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              background: C.bg1, border: `1px solid ${C.border0}`,
              borderRadius: 10, padding: "14px 20px", marginBottom: 24,
            }}>
              <Step n="1" label="Drop Excel" active={stage === "idle"} done={["parsed","normalizing","done"].includes(stage)} />
              <Divider active={["parsed","normalizing","done"].includes(stage)} />
              <Step n="2" label="Store Raw Blob" active={stage === "dropped"} done={["parsed","normalizing","done"].includes(stage)} />
              <Divider active={["parsed","normalizing","done"].includes(stage)} />
              <Step n="3" label="Parse & Detect Headers" active={stage === "parsed"} done={["normalizing","done"].includes(stage)} />
              <Divider active={["normalizing","done"].includes(stage)} />
              <Step n="4" label="Normalize Fields" active={stage === "normalizing"} done={stage === "done"} />
              <Divider active={stage === "done"} />
              <Step n="5" label="Enqueue to Scheduler" active={false} done={queued.length > 0} />

              {stage === "done" && queued.length === 0 && (
                <button
                  onClick={enqueueValid}
                  style={{
                    marginLeft: "auto", padding: "7px 18px", borderRadius: 6,
                    background: C.blue.bg, border: `1px solid ${C.blue.border}`,
                    color: C.blue.text, fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>
                  → Send {valid.filter(r => r.status !== "cancelled" && r.status !== "complete").length} orders to queue
                </button>
              )}
              {queued.length > 0 && (
                <div className="ml-auto">
                  <Tag color={C.green} label={`${queued.length} orders queued ✓`} />
                </div>
              )}
            </div>

            {/* DROP ZONE */}
            {stage === "idle" && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? C.blue.border : C.border1}`,
                  borderRadius: 12, padding: "60px 40px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                  background: dragOver ? C.blue.bg : C.bg1,
                  cursor: "pointer", transition: "all 0.15s",
                  marginBottom: 24,
                }}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                  onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                <div style={{ fontSize: 36 }}>📂</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text0 }}>Drop your Hélios Excel export here</div>
                  <div style={{ fontSize: 12, color: C.text1, marginTop: 4 }}>Accepts .xlsx or .xls · All OF column variants supported</div>
                </div>
                <div style={{
                  display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4,
                }}>
                  {["NUM_OF", "REF_ARTICLE", "DESIGNATION", "QTE_LANCEE", "DATE_FIN_PREV", "CLIENT", "PRIORITE"].map(f => (
                    <span key={f} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 4,
                      background: C.bg3, border: `1px solid ${C.border1}`,
                      color: C.text1, fontFamily: "'DM Mono', monospace",
                    }}>{f}</span>
                  ))}
                  <span style={{ fontSize: 10, color: C.text2, alignSelf: "center" }}>+ 40 more variants</span>
                </div>
              </div>
            )}

            {/* PARSED — show raw blob preview + normalize button */}
            {stage === "parsed" && rawBlob && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  background: C.bg1, border: `1px solid ${C.border0}`,
                  borderRadius: 10, overflow: "hidden",
                }}>
                  {/* Blob meta */}
                  <div style={{
                    padding: "12px 18px", borderBottom: `1px solid ${C.border0}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18 }}>📦</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text0 }}>Raw Blob Stored</div>
                        <div style={{ fontSize: 11, color: C.text1, fontFamily: "'DM Mono', monospace" }}>{fileName}</div>
                      </div>
                      <Tag color={C.green} label="Blob OK" />
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.text1 }}>
                      <span><b style={{ color: C.text0 }}>{rawBlob.length}</b> rows</span>
                      <span><b style={{ color: C.text0 }}>{headers.length}</b> columns detected</span>
                    </div>
                  </div>

                  {/* Detected headers */}
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border0}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                      Detected Columns
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {headers.map(h => {
                        const cleanKey = h?.toString().trim().toUpperCase().replace(/\s+/g, " ");
                        const mapped = HELIOS_MAP[cleanKey];
                        return (
                          <div key={h} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "3px 9px", borderRadius: 5, fontSize: 11,
                            background: mapped ? C.green.bg : C.bg3,
                            border: `1px solid ${mapped ? C.green.border : C.border0}`,
                            color: mapped ? C.green.text : C.text1,
                            fontFamily: "'DM Mono', monospace",
                          }}>
                            {h}
                            {mapped && <span style={{ color: C.text2, fontSize: 10 }}>→ {mapped}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Raw preview */}
                  <div style={{ padding: "12px 18px", overflowX: "auto" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                      Raw Preview (first 3 rows)
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          {headers.slice(0, 8).map(h => (
                            <th key={h} style={{
                              padding: "6px 10px", textAlign: "left",
                              color: C.text2, borderBottom: `1px solid ${C.border0}`,
                              fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 10,
                              whiteSpace: "nowrap",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawBlob.slice(0, 3).map((row, i) => (
                          <tr key={i} style={{ background: i % 2 ? C.bg2 : "transparent" }}>
                            {headers.slice(0, 8).map(h => (
                              <td key={h} style={{
                                padding: "6px 10px", color: C.text1,
                                borderBottom: `1px solid ${C.border0}40`,
                                fontFamily: "'DM Mono', monospace",
                                maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{String(row[h] ?? "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border0}`, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={runNormalize} style={{
                      padding: "8px 22px", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text,
                    }}>
                      ⚙ Normalize {rawBlob.length} rows →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NORMALIZING */}
            {stage === "normalizing" && (
              <div style={{
                background: C.bg1, border: `1px solid ${C.border0}`,
                borderRadius: 10, padding: 32, textAlign: "center", marginBottom: 24,
              }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>⚙</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text0 }}>Normalizing fields…</div>
                <div style={{ fontSize: 12, color: C.text1, marginTop: 4 }}>Mapping Hélios columns → AeroFab schema</div>
              </div>
            )}

            {/* DONE — normalized results */}
            {stage === "done" && normalized.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                {/* Summary row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 14 }}>
                  {[
                    { label: "Total", val: normalized.length, color: C.blue },
                    { label: "Valid", val: valid.length, color: C.green },
                    { label: "Warnings", val: warns.length, color: C.orange },
                    { label: "Errors", val: invalid.length, color: C.red },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{
                      background: color.bg, border: `1px solid ${color.border}`,
                      borderRadius: 8, padding: "12px 16px",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: color.text }}>{val}</div>
                      <div style={{ fontSize: 11, color: color.text, opacity: 0.7, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { key: "valid",   label: `Valid (${valid.length})` },
                    { key: "invalid", label: `Errors (${invalid.length})` },
                    { key: "all",     label: `All (${normalized.length})` },
                    ...(queued.length ? [{ key: "queued", label: `Queued (${queued.length})` }] : []),
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                      background: tab === key ? C.blue.bg : C.bg2,
                      border: `1px solid ${tab === key ? C.blue.border : C.border0}`,
                      color: tab === key ? C.blue.text : C.text1,
                      fontWeight: tab === key ? 700 : 400,
                    }}>{label}</button>
                  ))}
                </div>

                {/* Table */}
                <div style={{
                  background: C.bg1, border: `1px solid ${C.border0}`,
                  borderRadius: 10, overflow: "hidden",
                }}>
                  <div className="overflow-x-auto">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: C.bg2 }}>
                          {["Order ID", "Part Number", "Part Name", "Qty", "Customer", "Deadline", "Priority", "Status", "Issues"].map(h => (
                            <th key={h} style={{
                              padding: "9px 12px", textAlign: "left",
                              color: C.text2, borderBottom: `1px solid ${C.border0}`,
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayRows.map((row, i) => (
                          <React.Fragment key={i}>
                            <tr
                              onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                              style={{
                                background: i % 2 ? C.bg2 : "transparent",
                                borderLeft: `3px solid ${row._valid ? (row._warnings.length ? C.orange.border : C.green.border) : C.red.border}`,
                                cursor: "pointer",
                              }}
                              className="hover:bg-[#1E2C3A] transition-colors"
                            >
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text0, fontWeight: 600 }}>
                                {row.order_id || <span style={{ color: C.red.text }}>MISSING</span>}
                              </td>
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text1 }}>
                                {row.part_number || "—"}
                              </td>
                              <td style={{ padding: "9px 12px", color: C.text0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row.part_name || "—"}
                              </td>
                              <td style={{ padding: "9px 12px", color: C.text1 }}>{row.quantity || "—"}</td>
                              <td style={{ padding: "9px 12px", color: C.text0, fontWeight: 600 }}>{row.customer || "—"}</td>
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text1 }}>{row.deadline || "—"}</td>
                              <td style={{ padding: "9px 12px" }}><PriorityTag p={row.priority} /></td>
                              <td style={{ padding: "9px 12px" }}><StatusTag s={row.status} /></td>
                              <td style={{ padding: "9px 12px" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {row._errors.length > 0 && <Tag color={C.red} label={`${row._errors.length} err`} />}
                                  {row._warnings.length > 0 && <Tag color={C.orange} label={`${row._warnings.length} warn`} />}
                                  {row._valid && row._warnings.length === 0 && <Tag color={C.green} label="OK" />}
                                </div>
                              </td>
                            </tr>
                            {expandedRow === i && (
                              <tr style={{ background: C.bg3 }}>
                                <td colSpan={9} style={{ padding: "12px 16px" }}>
                                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                    {row._errors.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: C.red.text, textTransform: "uppercase", marginBottom: 4 }}>Errors</div>
                                        {row._errors.map((e: string, ei: number) => (
                                          <div key={ei} style={{ fontSize: 11, color: C.red.text, marginBottom: 2 }}>✕ {e}</div>
                                        ))}
                                      </div>
                                    )}
                                    {row._warnings.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: C.orange.text, textTransform: "uppercase", marginBottom: 4 }}>Warnings</div>
                                        {row._warnings.map((w: string, wi: number) => (
                                          <div key={wi} style={{ fontSize: 11, color: C.orange.text, marginBottom: 2 }}>⚠ {w}</div>
                                        ))}
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase", marginBottom: 4 }}>Unknown / Unmapped Columns</div>
                                      {Object.entries(row).filter(([k]) => k.startsWith("_unknown_")).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: 11, color: C.text1, fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
                                          <span style={{ color: C.text2 }}>{k.replace("_unknown_", "")}</span>: {String(v)}
                                        </div>
                                      ))}
                                      {Object.entries(row).filter(([k]) => k.startsWith("_unknown_")).length === 0 &&
                                        <span style={{ fontSize: 11, color: C.text2 }}>None — all columns mapped</span>
                                      }
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* RESET */}
            {stage !== "idle" && (
              <div style={{ padding: "8px 0", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => {
                  setStage("idle"); setRawBlob(null); setNormalized([]);
                  setQueued([]); setFileName(""); setHeaders([]); setExpandedRow(null);
                }} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  background: "transparent", border: `1px solid ${C.border1}`, color: C.text1,
                }}>↺ Reset pipeline</button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
