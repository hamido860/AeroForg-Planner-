import React, { useState, useRef, useCallback, useEffect } from "react";
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

// ─── HÉLIOS FIELD MAP & FUZZY RESOLVER ─────────────────────────────────────────
const RAW_MAPPINGS: Record<string, string> = {
  // erp_order_id
  "ERP_ORDER_ID": "erp_order_id", "ERP ORDER ID": "erp_order_id", "ORDER_ID": "erp_order_id", "ORDER ID": "erp_order_id",
  "ORDER": "erp_order_id", "ORDER_NO": "erp_order_id", "ORDER NO": "erp_order_id", "ORDER_NUM": "erp_order_id",
  "ORDER_NUMBER": "erp_order_id", "ORDER NUMBER": "erp_order_id", "ORDER#": "erp_order_id", "ORDER #": "erp_order_id",
  "NUM_OF": "erp_order_id", "NUM OF": "erp_order_id", "N° OF": "erp_order_id", "N°OF": "erp_order_id",
  "NO_OF": "erp_order_id", "NO OF": "erp_order_id", "OF": "erp_order_id", "OF#": "erp_order_id", "OF #": "erp_order_id",
  "COMMANDE": "erp_order_id", "NUM_COMMANDE": "erp_order_id", "NUM COMMANDE": "erp_order_id", "JOB_ID": "erp_order_id",
  "JOB ID": "erp_order_id", "JOB_NUMBER": "erp_order_id", "JOB NUMBER": "erp_order_id", "JOB#": "erp_order_id", "JOB": "erp_order_id",
  "ID": "erp_order_id",

  // part_reference
  "PART_REFERENCE": "part_reference", "PART REFERENCE": "part_reference", "PART_REF": "part_reference", "PART REF": "part_reference",
  "PART_REF.": "part_reference", "PART REF.": "part_reference", "PART_NUMBER": "part_reference", "PART NUMBER": "part_reference",
  "PART_NO": "part_reference", "PART NO": "part_reference", "PART#": "part_reference", "PART #": "part_reference",
  "PART": "part_reference", "REF_ARTICLE": "part_reference", "REF ARTICLE": "part_reference", "RÉF ARTICLE": "part_reference",
  "RÉF_ARTICLE": "part_reference", "RÉF. ARTICLE": "part_reference", "REF. ARTICLE": "part_reference", "ARTICLE": "part_reference",
  "RÉF": "part_reference", "REF": "part_reference", "CODE_ARTICLE": "part_reference", "CODE ARTICLE": "part_reference",
  "ITEM_REF": "part_reference", "ITEM REF": "part_reference", "ITEM": "part_reference", "REFERENCE": "part_reference",

  // designation
  "DESIGNATION": "designation", "DÉSIGNATION": "designation", "DESCRIPTION": "designation", "PART_DESCRIPTION": "designation",
  "PART DESCRIPTION": "designation", "DESC": "designation", "LIBELLE": "designation", "LIBELLÉ": "designation",
  "LABEL": "designation", "NAME": "designation", "TITLE": "designation", "NOM_ARTICLE": "designation",

  // quantity
  "QUANTITY": "quantity", "QUANTITÉ": "quantity", "QUANTITE": "quantity", "QTY": "quantity", "QTE": "quantity",
  "QTE_LANCEE": "quantity", "QTE LANCEE": "quantity", "QTE_LANCÉE": "quantity", "QTÉ_LANCÉE": "quantity",
  "QTÉ LANCÉE": "quantity", "AMOUNT": "quantity", "COUNT": "quantity",

  // estimated_load_hours
  "ESTIMATED_LOAD_HOURS": "estimated_load_hours", "ESTIMATED LOAD HOURS": "estimated_load_hours",
  "EST_LOAD_HOURS": "estimated_load_hours", "EST_HRS": "estimated_load_hours", "EST HRS": "estimated_load_hours",
  "EST_HOURS": "estimated_load_hours", "EST HOURS": "estimated_load_hours", "ESTIMATED_HOURS": "estimated_load_hours",
  "ESTIMATED HOURS": "estimated_load_hours", "LOAD_HOURS": "estimated_load_hours", "LOAD HOURS": "estimated_load_hours",
  "HOURS": "estimated_load_hours", "HRS": "estimated_load_hours", "TEMPS_ESTIME": "estimated_load_hours",
  "TEMPS_PREVU": "estimated_load_hours", "TEMPS PREVU": "estimated_load_hours", "TEMPS": "estimated_load_hours", "LOAD": "estimated_load_hours",

  // planned_start_at
  "PLANNED_START_AT": "planned_start_at", "PLANNED START AT": "planned_start_at", "PLANNED_START": "planned_start_at",
  "PLANNED START": "planned_start_at", "PLANNED_START_DATE": "planned_start_at", "PLANNED START DATE": "planned_start_at",
  "DATE_DEBUT_PREV": "planned_start_at", "DATE DEBUT PREV": "planned_start_at", "DATE_DEBUT": "planned_start_at",
  "DATE DEBUT": "planned_start_at", "START_DATE": "planned_start_at", "START DATE": "planned_start_at",
  "START": "planned_start_at", "DEBUT": "planned_start_at",

  // planned_end_at
  "PLANNED_END_AT": "planned_end_at", "PLANNED END AT": "planned_end_at", "PLANNED_END": "planned_end_at",
  "PLANNED END": "planned_end_at", "PLANNED_END_DATE": "planned_end_at", "PLANNED END DATE": "planned_end_at",
  "DATE_FIN_PREV": "planned_end_at", "DATE FIN PREV": "planned_end_at", "DATE_FIN": "planned_end_at",
  "DATE FIN": "planned_end_at", "END_DATE": "planned_end_at", "END DATE": "planned_end_at",
  "END": "planned_end_at", "FIN": "planned_end_at", "DUE_DATE": "planned_end_at", "DUE DATE": "planned_end_at", "DUE": "planned_end_at",

  // erp_status
  "ERP_STATUS": "erp_status", "ERP STATUS": "erp_status", "STATUT_OF": "erp_status", "STATUT OF": "erp_status",
  "STATUT": "erp_status", "STATUS": "erp_status", "STATE": "erp_status", "ORDER_STATUS": "erp_status",

  // aircraft_zone
  "AIRCRAFT_ZONE": "aircraft_zone", "AIRCRAFT ZONE": "aircraft_zone", "ZONE": "aircraft_zone", "ZONE_AVION": "aircraft_zone",

  // work_center_code
  "WORK_CENTER_CODE": "work_center_code", "WORK CENTER CODE": "work_center_code", "WORK_CENTER": "work_center_code",
  "WORK CENTER": "work_center_code", "WC_CODE": "work_center_code", "WC CODE": "work_center_code", "WC": "work_center_code",
  "CENTRE_DE_CHARGE": "work_center_code", "CENTRE DE CHARGE": "work_center_code",

  // order_type
  "ORDER_TYPE": "order_type", "ORDER TYPE": "order_type", "TYPE": "order_type", "PRIORITY": "order_type", "PRIORITÉ": "order_type",

  // planner_name
  "PLANNER_NAME": "planner_name", "PLANNER NAME": "planner_name", "PLANNER": "planner_name", "GESTIONNAIRE": "planner_name",

  // production_site
  "PRODUCTION_SITE": "production_site", "PRODUCTION SITE": "production_site", "SITE": "production_site",

  // material_mode
  "MATERIAL_MODE": "material_mode", "MATERIAL MODE": "material_mode",

  // supply_status
  "SUPPLY_STATUS": "supply_status", "SUPPLY STATUS": "supply_status"
};

export const TARGET_FIELDS = [
  { value: "erp_order_id", label: "Order ID (NUM_OF)" },
  { value: "part_reference", label: "Part Reference (REF_ARTICLE)" },
  { value: "designation", label: "Designation / Part Name" },
  { value: "quantity", label: "Quantity (QTE_LANCEE)" },
  { value: "estimated_load_hours", label: "Estimated Hours" },
  { value: "planned_start_at", label: "Planned Start Date" },
  { value: "planned_end_at", label: "Planned End Date" },
  { value: "erp_status", label: "Status (STATUT)" },
  { value: "aircraft_zone", label: "Aircraft Zone" },
  { value: "work_center_code", label: "Work Center Code" },
  { value: "order_type", label: "Order Type / Priority" },
  { value: "planner_name", label: "Planner Name" },
  { value: "production_site", label: "Production Site" },
  { value: "material_mode", label: "Material Mode" },
  { value: "supply_status", label: "Supply Status" },
  { value: "IGNORE", label: "❌ Ignore Column" }
];

export function resolveHeliosField(rawKey: string, customMappings?: Record<string, string>): string | null {
  if (!rawKey) return null;
  const clean = rawKey.toString().replace(/^\uFEFF/, '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (customMappings && customMappings[clean] !== undefined) {
    return customMappings[clean] === "IGNORE" ? null : customMappings[clean];
  }
  if (RAW_MAPPINGS[clean]) return RAW_MAPPINGS[clean];

  // Strip all non-alphanumeric chars
  const stripped = clean.replace(/[^A-Z0-9]/g, '');
  if (!stripped) return null;

  for (const [k, v] of Object.entries(RAW_MAPPINGS)) {
    if (k.replace(/[^A-Z0-9]/g, '') === stripped) return v;
  }

  // Fuzzy keyword inspection
  if (stripped.includes("START") || stripped.includes("DEBUT")) return "planned_start_at";
  if (stripped.includes("END") || stripped.includes("FIN") || stripped.includes("DUE")) return "planned_end_at";
  if (stripped.includes("ORDER") || stripped.includes("COMMANDE") || stripped.includes("NUMOF") || stripped.includes("JOB")) return "erp_order_id";
  if (stripped.includes("PART") || stripped.includes("ARTICLE") || stripped.includes("ITEM") || stripped.includes("REF")) return "part_reference";
  if (stripped.includes("DESIG") || stripped.includes("DESC") || stripped.includes("LIBEL") || stripped.includes("LABEL")) return "designation";
  if (stripped.includes("QTY") || stripped.includes("QTE") || stripped.includes("QUANT") || stripped.includes("COUNT")) return "quantity";
  if (stripped.includes("HRS") || stripped.includes("HOUR") || stripped.includes("LOAD") || stripped.includes("TEMPS")) return "estimated_load_hours";
  if (stripped.includes("STATU") || stripped.includes("STATE")) return "erp_status";
  if (stripped.includes("WORK") || stripped.includes("CENTER") || stripped.includes("CENTRE") || stripped.includes("WC")) return "work_center_code";
  if (stripped.includes("ZONE")) return "aircraft_zone";
  if (stripped.includes("TYPE") || stripped.includes("PRIOR")) return "order_type";
  if (stripped.includes("PLANNER")) return "planner_name";

  return null;
}

// ─── NORMALIZER ───────────────────────────────────────────────────────────────
function normalizeRow(rawRow: any, index: number, customMappings?: Record<string, string>) {
  const normalized: any = { _raw: rawRow, _index: index, _errors: [], _warnings: [] };

  for (const [rawKey, val] of Object.entries(rawRow)) {
    const field = resolveHeliosField(rawKey, customMappings);
    const cleanValue = val != null ? val.toString().trim() : "";
    if (field) {
      normalized[field] = cleanValue;
    } else {
      const cleanKey = rawKey?.toString().trim().toUpperCase().replace(/\s+/g, " ");
      normalized[`_unknown_${cleanKey}`] = cleanValue;
    }
  }

  // Fallback for missing order ID
  if (!normalized.erp_order_id) {
    const rawVals = Object.values(rawRow).map(v => v != null ? v.toString().trim() : "").filter(Boolean);
    if (rawVals.length > 0 && rawVals[0]) {
      normalized.erp_order_id = rawVals[0];
      normalized._warnings.push(`Auto-assigned order ID from first column (${rawVals[0]})`);
    } else {
      normalized.erp_order_id = `OF-${(index + 1).toString().padStart(5, '0')}`;
      normalized._warnings.push(`Missing Order ID, generated ${normalized.erp_order_id}`);
    }
  }

  // Fallback for missing part reference
  if (!normalized.part_reference) {
    if (normalized.designation) {
      normalized.part_reference = `REF-${normalized.designation.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
      normalized._warnings.push(`Part reference generated from designation`);
    } else {
      normalized.part_reference = `REF-STD-${(index + 1).toString().padStart(4, '0')}`;
      normalized._warnings.push(`Part reference missing, defaulted to generic reference`);
    }
  }

  // Fallback for designation
  if (!normalized.designation) {
    normalized.designation = normalized.part_reference ? `Part ${normalized.part_reference}` : "Aero Structure Part";
  }

  // Quantity parsing
  if (normalized.quantity) {
    const parsedQty = parseInt(normalized.quantity.toString().replace(/[^0-9]/g, ""), 10);
    normalized.quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
  } else {
    normalized.quantity = 1;
  }

  // Estimated hours parsing
  if (normalized.estimated_load_hours) {
    const rawHrsStr = normalized.estimated_load_hours.toString().replace(",", ".");
    const parsedHrs = parseFloat(rawHrsStr.replace(/[^0-9\.]/g, ""));
    normalized.estimated_load_hours = !isNaN(parsedHrs) ? parsedHrs : 0;
  } else {
    normalized.estimated_load_hours = 0;
  }

  // Date parsing
  for (const dateField of ["planned_start_at", "planned_end_at"]) {
    if (normalized[dateField]) {
      const d = parseHeliosDate(normalized[dateField]);
      if (d) normalized[dateField] = d;
    }
  }

  // Priority / order_type
  const p = (normalized.order_type || "").toString().toUpperCase();
  if (p.includes("URGENT") || p.includes("HIGH")) normalized.priority = "HIGH";
  else if (p.includes("STANDARD") || p.includes("MEDIUM")) normalized.priority = "MEDIUM";
  else normalized.priority = "LOW";

  // Status mapping
  const rawStatus = (normalized.erp_status || "").toString().toUpperCase();
  if (rawStatus.includes("LANC") || rawStatus.includes("EN_COURS") || rawStatus.includes("ACTIVE") || rawStatus.includes("IN_PROGRESS") || rawStatus.includes("RUN")) {
    normalized.status = "active";
  } else if (rawStatus.includes("TERM") || rawStatus.includes("FINISH") || rawStatus.includes("COMPLET")) {
    normalized.status = "complete";
  } else if (rawStatus.includes("CANCEL") || rawStatus.includes("ANNUL")) {
    normalized.status = "cancelled";
  } else {
    normalized.status = "scheduled";
  }

  normalized._valid = normalized._errors.length === 0;
  return normalized;
}

function parseHeliosDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    if (val > 1000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
    return null;
  }
  const s = val.toString().trim();
  if (!s) return null;

  if (!isNaN(Number(s)) && Number(s) > 1000) {
    const d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  const fr = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (fr) {
    const day = fr[1].padStart(2, "0");
    const month = fr[2].padStart(2, "0");
    const year = fr[3];
    return `${year}-${month}-${day}`;
  }

  const iso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (iso) {
    const year = iso[1];
    const month = iso[2].padStart(2, "0");
    const day = iso[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return s;
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

// ─── MODEL TEMPLATES DEFAULT ──────────────────────────────────────────────
interface MappingModelTemplate {
  id: string;
  name: string;
  mappings: Record<string, string>;
  hiddenColumns: string[];
}

export interface DataCleaningOptions {
  trimWhitespace: boolean;
  fixDecimals: boolean;
  standardizeDates: boolean;
  removeEmptyRows: boolean;
  removeDuplicates: boolean;
  sanitizeHeaders: boolean;
}

export interface PreParseFilterOptions {
  skipTopRows: number;
  skipBottomRows: number;
  excludeKeywords: string;
  includeKeywords: string;
  maxRows: number;
  columnFilterField: string;
  columnFilterValue: string;
}

export function applyPreParseFilter(rows: any[], options: PreParseFilterOptions) {
  if (!rows || !rows.length) return { filteredRows: [], stats: { originalTotal: 0, keptTotal: 0, filteredOut: 0 } };
  
  let current = [...rows];
  const originalTotal = current.length;

  // 1. Skip top rows
  if (options.skipTopRows > 0 && current.length > options.skipTopRows) {
    current = current.slice(options.skipTopRows);
  }

  // 2. Skip bottom rows
  if (options.skipBottomRows > 0 && current.length > options.skipBottomRows) {
    current = current.slice(0, Math.max(0, current.length - options.skipBottomRows));
  }

  // 3. Exclude keywords filter
  const excludeList = options.excludeKeywords
    ? options.excludeKeywords.split(/[,;]/).map(k => k.trim().toLowerCase()).filter(Boolean)
    : [];
    
  if (excludeList.length > 0) {
    current = current.filter(row => {
      const rowValuesStr = Object.values(row).map(v => String(v).toLowerCase()).join(" ");
      return !excludeList.some(k => rowValuesStr.includes(k));
    });
  }

  // 4. Include keywords filter
  const includeList = options.includeKeywords
    ? options.includeKeywords.split(/[,;]/).map(k => k.trim().toLowerCase()).filter(Boolean)
    : [];

  if (includeList.length > 0) {
    current = current.filter(row => {
      const rowValuesStr = Object.values(row).map(v => String(v).toLowerCase()).join(" ");
      return includeList.some(k => rowValuesStr.includes(k));
    });
  }

  // 5. Targeted column filter
  if (options.columnFilterField && options.columnFilterValue) {
    const valLow = options.columnFilterValue.trim().toLowerCase();
    current = current.filter(row => {
      const cellVal = String(row[options.columnFilterField] ?? "").toLowerCase();
      return cellVal.includes(valLow);
    });
  }

  // 6. Max rows limit
  if (options.maxRows > 0 && current.length > options.maxRows) {
    current = current.slice(0, options.maxRows);
  }

  return {
    filteredRows: current,
    stats: {
      originalTotal,
      keptTotal: current.length,
      filteredOut: Math.max(0, originalTotal - current.length)
    }
  };
}

export function cleanRawBlobData(
  rows: any[],
  headers: string[],
  options: DataCleaningOptions
) {
  let trimmedCount = 0;
  let decimalCount = 0;
  let dateCount = 0;
  const initialRows = rows.length;

  let cleanedHeaders = [...headers];
  const headerMap: Record<string, string> = {};

  if (options.sanitizeHeaders) {
    cleanedHeaders = headers.map(h => {
      if (!h) return "COLUMN";
      return h.toString().replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ').replace(/^["']|["']$/g, '') || "COLUMN";
    });
  }

  const uniqueHeaders: string[] = [];
  cleanedHeaders.forEach((h, idx) => {
    let finalH = h;
    let counter = 1;
    while (uniqueHeaders.includes(finalH)) {
      finalH = `${h}_${counter++}`;
    }
    uniqueHeaders.push(finalH);
    const origKey = headers[idx];
    if (origKey) {
      headerMap[origKey] = finalH;
    }
  });

  const formatDateStr = (valStr: string) => {
    const frDateMatch = valStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (frDateMatch) {
      const day = frDateMatch[1].padStart(2, '0');
      const month = frDateMatch[2].padStart(2, '0');
      const year = frDateMatch[3];
      return `${year}-${month}-${day}`;
    }
    return valStr;
  };

  const formatDecimalStr = (valStr: string) => {
    if (/^-?\d+,\d+$/.test(valStr)) {
      return valStr.replace(',', '.');
    }
    const cleanNum = valStr.replace(/[€$EUR\s]/gi, '');
    if (/^-?\d+,\d+$/.test(cleanNum)) {
      return cleanNum.replace(',', '.');
    }
    if (/^-?\d{1,3}(\s\d{3})+,\d+$/.test(valStr)) {
      return valStr.replace(/[€$EUR\s]/gi, '').replace(',', '.');
    }
    return valStr;
  };

  const cleanedRows: any[] = [];
  const seenSignatures = new Set<string>();

  for (const rawRow of rows) {
    if (!rawRow || typeof rawRow !== 'object') continue;

    const newRow: any = {};
    let hasValue = false;

    for (const [origKey, val] of Object.entries(rawRow)) {
      const targetHeader = headerMap[origKey] || origKey;
      if (val === null || val === undefined) {
        newRow[targetHeader] = "";
        continue;
      }

      let valStr = String(val);
      const origStr = valStr;

      if (options.trimWhitespace) {
        valStr = valStr.trim().replace(/^["']|["']$/g, '').replace(/\r/g, '');
        if (valStr !== origStr) trimmedCount++;
      }

      if (valStr !== "") {
        hasValue = true;
      }

      if (options.fixDecimals && valStr) {
        const cleanedDec = formatDecimalStr(valStr);
        if (cleanedDec !== valStr) {
          valStr = cleanedDec;
          decimalCount++;
        }
      }

      if (options.standardizeDates && valStr) {
        const cleanedDate = formatDateStr(valStr);
        if (cleanedDate !== valStr) {
          valStr = cleanedDate;
          dateCount++;
        }
      }

      newRow[targetHeader] = valStr;
    }

    if (options.removeEmptyRows && !hasValue) {
      continue;
    }

    if (options.removeDuplicates) {
      const sig = JSON.stringify(newRow);
      if (seenSignatures.has(sig)) {
        continue;
      }
      seenSignatures.add(sig);
    }

    cleanedRows.push(newRow);
  }

  return {
    cleanedRows,
    cleanedHeaders: uniqueHeaders,
    stats: {
      initialRows,
      finalRows: cleanedRows.length,
      trimmedCount,
      decimalCount,
      dateCount,
      emptyRowsRemoved: Math.max(0, initialRows - cleanedRows.length),
      duplicatesRemoved: options.removeDuplicates ? Math.max(0, initialRows - cleanedRows.length) : 0
    }
  };
}

const DEFAULT_TEMPLATES: MappingModelTemplate[] = [
  {
    id: "model-1",
    name: "Model 1 - Standard Hélios OF",
    mappings: {
      "NUM_OF": "erp_order_id",
      "REF_ARTICLE": "part_reference",
      "DESIGNATION": "designation",
      "QTE_LANCEE": "quantity",
      "TPS_PREVU": "estimated_load_hours",
      "DATE_FIN_PREV": "planned_end_at",
      "STATUT": "erp_status"
    },
    hiddenColumns: []
  },
  {
    id: "model-2",
    name: "Model 2 - Airbus / Supplier CSV",
    mappings: {
      "ORDER ID": "erp_order_id",
      "PART REF": "part_reference",
      "DESIGNATION": "designation",
      "QTY": "quantity",
      "EST HRS": "estimated_load_hours",
      "PLANNED START": "planned_start_at",
      "PLANNED END": "planned_end_at",
      "STATUS": "erp_status"
    },
    hiddenColumns: []
  }
];

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
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [showMappingEditor, setShowMappingEditor] = useState(false);

  // Column Visibility state
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [headerNameSearch, setHeaderNameSearch] = useState<string>("");

  // Column Analytics & Smart Keyword Filter state
  const [smartFilters, setSmartFilters] = useState({
    creator: "",
    client: "",
    program: "",
    user: "",
    keyword: ""
  });
  const [hiddenSmartFilters, setHiddenSmartFilters] = useState<Record<string, boolean>>({
    creator: false,
    client: false,
    program: false,
    user: false,
    keyword: false
  });
  const [showSmartFilterPanel, setShowSmartFilterPanel] = useState(true);

  // Column Analytics: Detect Creator, Client, Program, User columns from headers or custom overrides
  const [columnOverrides, setColumnOverrides] = useState<{
    creatorCol: string;
    progCol: string;
    statutCol: string;
    userCol: string;
  }>({
    creatorCol: "",
    progCol: "",
    statutCol: "",
    userCol: ""
  });

  const columnAnalytics = React.useMemo(() => {
    if (!headers || !headers.length) return { creatorCol: "", progCol: "", statutCol: "", userCol: "" };
    let creatorCol = columnOverrides.creatorCol;
    let progCol = columnOverrides.progCol;
    let statutCol = columnOverrides.statutCol;
    let userCol = columnOverrides.userCol;

    headers.forEach(h => {
      const low = h.toLowerCase();
      if (!creatorCol && (low.includes("crée par") || low.includes("cree par") || low.includes("creator") || low.includes("author") || low.includes("created_by") || low.includes("by"))) {
        creatorCol = h;
      } else if (!progCol && (low.includes("prog") || low.includes("program") || low.includes("project") || low.includes("campaign") || low.includes("initiative"))) {
        progCol = h;
      } else if (!statutCol && (low.includes("statut") || low.includes("status") || low.includes("state") || low.includes("stage"))) {
        statutCol = h;
      } else if (!userCol && (low.includes("user") || low.includes("assignee") || low.includes("owner") || low.includes("member") || low.includes("name"))) {
        userCol = h;
      }
    });

    if (!creatorCol && headers.length > 0) creatorCol = headers[0];
    if (!progCol && headers.length > 1) progCol = headers[1];
    if (!statutCol && headers.length > 2) statutCol = headers[2];
    if (!userCol && headers.length > 3) userCol = headers[3];

    return { creatorCol, progCol, statutCol, userCol };
  }, [headers, columnOverrides]);

  const uniqueCreators = React.useMemo(() => {
    if (!rawBlob || !columnAnalytics.creatorCol) return [];
    const set = new Set<string>();
    rawBlob.forEach(row => {
      const val = row[columnAnalytics.creatorCol];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        set.add(String(val).trim());
      }
    });
    return Array.from(set).sort();
  }, [rawBlob, columnAnalytics.creatorCol]);

  const uniqueProgs = React.useMemo(() => {
    if (!rawBlob || !columnAnalytics.progCol) return [];
    const set = new Set<string>();
    rawBlob.forEach(row => {
      const val = row[columnAnalytics.progCol];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        set.add(String(val).trim());
      }
    });
    return Array.from(set).sort();
  }, [rawBlob, columnAnalytics.progCol]);

  const uniqueStatuts = React.useMemo(() => {
    if (!rawBlob || !columnAnalytics.statutCol) return [];
    const set = new Set<string>();
    rawBlob.forEach(row => {
      const val = row[columnAnalytics.statutCol];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        set.add(String(val).trim());
      }
    });
    return Array.from(set).sort();
  }, [rawBlob, columnAnalytics.statutCol]);

  const uniqueUsers = React.useMemo(() => {
    if (!rawBlob || !columnAnalytics.userCol) return [];
    const set = new Set<string>();
    rawBlob.forEach(row => {
      const val = row[columnAnalytics.userCol];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        set.add(String(val).trim());
      }
    });
    return Array.from(set).sort();
  }, [rawBlob, columnAnalytics.userCol]);

  const smartFilteredRows = React.useMemo(() => {
    if (!rawBlob) return [];
    return rawBlob.filter(row => {
      if (!hiddenSmartFilters.creator && smartFilters.creator && columnAnalytics.creatorCol) {
        const val = String(row[columnAnalytics.creatorCol] ?? "").toLowerCase();
        if (!val.includes(smartFilters.creator.toLowerCase().trim())) return false;
      }
      if (!hiddenSmartFilters.client && smartFilters.client && columnAnalytics.progCol) {
        const val = String(row[columnAnalytics.progCol] ?? "").toLowerCase();
        if (!val.includes(smartFilters.client.toLowerCase().trim())) return false;
      }
      if (!hiddenSmartFilters.program && smartFilters.program && columnAnalytics.statutCol) {
        const val = String(row[columnAnalytics.statutCol] ?? "").toLowerCase();
        if (!val.includes(smartFilters.program.toLowerCase().trim())) return false;
      }
      if (!hiddenSmartFilters.user && smartFilters.user && columnAnalytics.userCol) {
        const val = String(row[columnAnalytics.userCol] ?? "").toLowerCase();
        if (!val.includes(smartFilters.user.toLowerCase().trim())) return false;
      }
      if (!hiddenSmartFilters.keyword && smartFilters.keyword) {
        const kw = smartFilters.keyword.toLowerCase().trim();
        const rowStr = Object.values(row).map(v => String(v).toLowerCase()).join(" ");
        if (!rowStr.includes(kw)) return false;
      }
      return true;
    });
  }, [rawBlob, smartFilters, hiddenSmartFilters, columnAnalytics]);

  // Data Cleaning state
  const [cleaningOptions, setCleaningOptions] = useState<DataCleaningOptions>({
    trimWhitespace: true,
    fixDecimals: true,
    standardizeDates: true,
    removeEmptyRows: true,
    removeDuplicates: true,
    sanitizeHeaders: true,
  });
  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [cleanStats, setCleanStats] = useState<{
    initialRows: number;
    finalRows: number;
    trimmedCount: number;
    decimalCount: number;
    dateCount: number;
    emptyRowsRemoved: number;
    duplicatesRemoved: number;
  } | null>(null);

  // Pre-Parse Filter state
  const [unfilteredBlob, setUnfilteredBlob] = useState<any[] | null>(null);
  const [preParseOptions, setPreParseOptions] = useState<PreParseFilterOptions>({
    skipTopRows: 0,
    skipBottomRows: 0,
    excludeKeywords: "TOTAL, SUBTOTAL, ANNULE, CANCELLED",
    includeKeywords: "",
    maxRows: 0,
    columnFilterField: "",
    columnFilterValue: "",
  });
  const [showPreParsePanel, setShowPreParsePanel] = useState(false);
  const [preParseStats, setPreParseStats] = useState<{
    originalTotal: number;
    keptTotal: number;
    filteredOut: number;
  } | null>(null);

  const executeDataCleaning = (customOpts?: DataCleaningOptions) => {
    if (!rawBlob || !headers.length) return;
    const opts = customOpts || cleaningOptions;
    const { cleanedRows, cleanedHeaders, stats } = cleanRawBlobData(rawBlob, headers, opts);
    setRawBlob(cleanedRows);
    setHeaders(cleanedHeaders);
    setCleanStats(stats);
  };

  const executePreParseFilter = (customFilterOpts?: PreParseFilterOptions, customCleanOpts?: DataCleaningOptions) => {
    if (!unfilteredBlob || !unfilteredBlob.length) return;
    const filterOpts = customFilterOpts || preParseOptions;
    const cleanOpts = customCleanOpts || cleaningOptions;

    const { filteredRows, stats: filterStats } = applyPreParseFilter(unfilteredBlob, filterOpts);
    const detectedHeaders = filteredRows.length ? Object.keys(filteredRows[0]) : headers;
    const { cleanedRows, cleanedHeaders, stats: cleaningStats } = cleanRawBlobData(filteredRows, detectedHeaders, cleanOpts);

    setHeaders(cleanedHeaders);
    setRawBlob(cleanedRows);
    setPreParseStats(filterStats);
    setCleanStats(cleaningStats);
  };

  // Template / Model state
  const [templates, setTemplates] = useState<MappingModelTemplate[]>(() => {
    try {
      const saved = localStorage.getItem("helios_saved_mapping_models");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TEMPLATES;
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("model-1");
  const [newModelName, setNewModelName] = useState("");
  const [showSaveModelInput, setShowSaveModelInput] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("helios_saved_mapping_models", JSON.stringify(templates));
    } catch (e) {}
  }, [templates]);

  const handleSelectTemplate = (modelId: string) => {
    setSelectedTemplateId(modelId);
    const tmpl = templates.find(t => t.id === modelId);
    if (tmpl) {
      setCustomMappings(tmpl.mappings || {});
      setHiddenColumns(tmpl.hiddenColumns || []);
    }
  };

  const handleSaveModel = () => {
    if (!newModelName.trim()) return;
    const newId = "model-" + Date.now();
    const newTemplate: MappingModelTemplate = {
      id: newId,
      name: newModelName.trim(),
      mappings: { ...customMappings },
      hiddenColumns: [...hiddenColumns]
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    setSelectedTemplateId(newId);
    setNewModelName("");
    setShowSaveModelInput(false);
  };

  const handleDeleteModel = (modelId: string) => {
    if (templates.length <= 1) {
      alert("At least one template model must remain.");
      return;
    }
    const updated = templates.filter(t => t.id !== modelId);
    setTemplates(updated);
    if (selectedTemplateId === modelId) {
      handleSelectTemplate(updated[0].id);
    }
  };

  const toggleColumnVisibility = (colName: string) => {
    setHiddenColumns(prev => 
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };
  
  // Manual creation state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    erp_order_id: "",
    part_reference: "",
    designation: "",
    quantity: 1,
    estimated_load_hours: 10,
    aircraft_zone: "Z1",
    work_center_code: "WC1",
    planned_start_at: "",
    planned_end_at: ""
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleDeleteFile = () => {
    setFileName("");
    setRawBlob(null);
    setHeaders([]);
    setNormalized([]);
    setQueued([]);
    setCustomMappings({});
    setShowMappingEditor(false);
    setStage("idle");
  };

  const handleRemapColumn = (header: string, targetField: string) => {
    const cleanKey = header.trim().toUpperCase().replace(/\s+/g, " ");
    setCustomMappings(prev => ({ ...prev, [cleanKey]: targetField }));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/helios/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualOrder)
      });
      if (res.ok) {
        alert("Order created successfully!");
        setShowManualForm(false);
        onClose();
      }
    } catch (err) {
      alert("Failed to create order");
    }
  };

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setStage("dropped");
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      try {
        let cleanRows: any[] = [];
        
        // Parse with XLSX
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "", blankrows: false });
        
        // Filter out empty rows where all cell values are blank
        cleanRows = (rawRows as any[]).filter((r: any) => {
          if (!r || typeof r !== "object") return false;
          return Object.values(r).some(v => v !== null && v !== undefined && String(v).trim() !== "");
        });

        // Check if XLSX misparsed a semicolon or tab separated CSV into a single column
        if (cleanRows.length > 0) {
          const firstKeys = Object.keys(cleanRows[0]);
          if (firstKeys.length === 1 && (firstKeys[0].includes(";") || firstKeys[0].includes("\t"))) {
            const sep = firstKeys[0].includes(";") ? ";" : "\t";
            const decoder = new TextDecoder();
            const textContent = decoder.decode(e.target.result as ArrayBuffer);
            const lines = textContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length > 0) {
              const fileHeaders = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));
              const parsedRows: any[] = [];
              for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
                if (parts.some(p => p !== "")) {
                  const rowObj: any = {};
                  fileHeaders.forEach((h, idx) => {
                    rowObj[h] = parts[idx] !== undefined ? parts[idx] : "";
                  });
                  parsedRows.push(rowObj);
                }
              }
              cleanRows = parsedRows;
            }
          }
        }

        const detectedHeaders = cleanRows.length ? Object.keys(cleanRows[0] as object) : [];
        setUnfilteredBlob(cleanRows);

        // Pre-Parse Filter
        const { filteredRows, stats: filterStats } = applyPreParseFilter(cleanRows, preParseOptions);

        // Pre-cleaning before mapping
        const { cleanedRows, cleanedHeaders, stats: cleaningStats } = cleanRawBlobData(filteredRows, detectedHeaders, cleaningOptions);
        
        setHeaders(cleanedHeaders);
        setRawBlob(cleanedRows);
        setPreParseStats(filterStats);
        setCleanStats(cleaningStats);
        setStage("parsed");
      } catch (err) {
        console.error("Error reading file", err);
        alert("Could not parse file. Please verify format.");
        setStage("idle");
      }
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
      const targetRows = smartFilteredRows.length > 0 || Object.values(smartFilters).some(Boolean) ? smartFilteredRows : rawBlob;
      const result = targetRows.map((row, i) => normalizeRow(row, i, customMappings));
      setNormalized(result);
      setStage("done");
    }, 600);
  };

  const enqueueValid = async () => {
    const valid = normalized.filter(r => r._valid && r.status !== "cancelled" && r.status !== "complete");
    setStage("normalizing"); // Use this as loading state
    
    try {
      const res = await fetch("/api/helios/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valid)
      });
      if (res.ok) {
        setQueued(valid);
        setTab("queued");
        setStage("done");
        setTimeout(() => onClose(), 1500); // Wait a moment then close
      } else {
        alert("Failed to submit to backend");
        setStage("done");
      }
    } catch (e) {
      alert("Error saving data");
      setStage("done");
    }
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
        className="fixed inset-0 bg-[#07090D] z-50 flex flex-col overflow-hidden"
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-[#07090D] w-full h-full flex flex-col overflow-hidden"
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

            {/* DROP ZONE or MANUAL FORM */}
            {stage === "idle" && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <button
                    onClick={() => setShowManualForm(false)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: !showManualForm ? C.blue.bg : C.bg2,
                      border: `1px solid ${!showManualForm ? C.blue.border : C.border0}`,
                      color: !showManualForm ? C.blue.text : C.text1
                    }}
                  >
                    📂 Import File (.xlsx / .csv)
                  </button>
                  <button
                    onClick={() => setShowManualForm(true)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: showManualForm ? C.blue.bg : C.bg2,
                      border: `1px solid ${showManualForm ? C.blue.border : C.border0}`,
                      color: showManualForm ? C.blue.text : C.text1
                    }}
                  >
                    ➕ Create Order Manually
                  </button>
                </div>

                {!showManualForm ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? C.blue.border : C.border1}`,
                      borderRadius: 12, padding: "50px 30px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                      background: dragOver ? C.blue.bg : C.bg1,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                      onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                    <div style={{ fontSize: 36 }}>📂</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text0 }}>Drop your Hélios Excel or CSV export here</div>
                      <div style={{ fontSize: 12, color: C.text1, marginTop: 4 }}>Accepts .xlsx, .xls, or .csv · All OF column variants supported</div>
                    </div>
                    <div style={{
                      display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4,
                    }}>
                      {["ORDER ID", "PART REF", "DESIGNATION", "QTY", "EST HRS", "PLANNED START", "PLANNED END", "STATUS"].map(f => (
                        <span key={f} style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 4,
                          background: C.bg3, border: `1px solid ${C.border1}`,
                          color: C.text1, fontFamily: "'DM Mono', monospace",
                        }}>{f}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateManualOrder} style={{
                    background: C.bg1, border: `1px solid ${C.border0}`, borderRadius: 10, padding: 20
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text0, marginBottom: 16 }}>
                      New AeroForg / Hélios Order Entry
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Order ID (NUM_OF)</label>
                        <input
                          required
                          placeholder="e.g. OF-2026-9901"
                          value={manualOrder.erp_order_id}
                          onChange={e => setManualOrder({ ...manualOrder, erp_order_id: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Part Reference</label>
                        <input
                          required
                          placeholder="e.g. PN-WING-44"
                          value={manualOrder.part_reference}
                          onChange={e => setManualOrder({ ...manualOrder, part_reference: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Designation</label>
                        <input
                          required
                          placeholder="e.g. Wing Spar Fitting"
                          value={manualOrder.designation}
                          onChange={e => setManualOrder({ ...manualOrder, designation: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={manualOrder.quantity}
                          onChange={e => setManualOrder({ ...manualOrder, quantity: parseInt(e.target.value) || 1 })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Estimated Load Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualOrder.estimated_load_hours}
                          onChange={e => setManualOrder({ ...manualOrder, estimated_load_hours: parseFloat(e.target.value) || 0 })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Aircraft Zone</label>
                        <input
                          value={manualOrder.aircraft_zone}
                          onChange={e => setManualOrder({ ...manualOrder, aircraft_zone: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Work Center</label>
                        <input
                          value={manualOrder.work_center_code}
                          onChange={e => setManualOrder({ ...manualOrder, work_center_code: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Planned Start</label>
                        <input
                          type="date"
                          value={manualOrder.planned_start_at}
                          onChange={e => setManualOrder({ ...manualOrder, planned_start_at: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: "uppercase" }}>Planned End</label>
                        <input
                          type="date"
                          value={manualOrder.planned_end_at}
                          onChange={e => setManualOrder({ ...manualOrder, planned_end_at: e.target.value })}
                          style={{ width: "100%", background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0, padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifySelf: "flex-end", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowManualForm(false)}
                        style={{ padding: "8px 16px", borderRadius: 6, fontSize: 12, color: C.text1, cursor: "pointer", background: "transparent", border: `1px solid ${C.border1}` }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: "8px 20px", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", background: "#3B82F6", border: "none" }}
                      >
                        Save Order
                      </button>
                    </div>
                  </form>
                )}
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
                    <div style={{ display: "flex", itemsCenter: "center", gap: 12, fontSize: 12, color: C.text1 }}>
                      <span><b style={{ color: C.text0 }}>{rawBlob.length}</b> rows</span>
                      <span><b style={{ color: C.text0 }}>{headers.length}</b> columns</span>
                      <button
                        onClick={handleDeleteFile}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: C.red.bg, border: `1px solid ${C.red.border}`, color: C.red.text,
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        🗑️ Delete File
                      </button>
                    </div>
                  </div>

                  {/* Pre-Parse Filter Bar */}
                  <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border0}`, background: C.bg2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text0 }}>🔍 Pre-Parse Filter Rules:</span>
                        {preParseStats && (
                          <span style={{ fontSize: 11, color: preParseStats.filteredOut > 0 ? C.blue.text : C.text1, background: preParseStats.filteredOut > 0 ? C.blue.bg : C.bg0, border: `1px solid ${preParseStats.filteredOut > 0 ? C.blue.border : C.border1}`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                            {preParseStats.filteredOut > 0
                              ? `Filtered ${preParseStats.filteredOut} rows (${preParseStats.originalTotal} → ${preParseStats.keptTotal} rows kept)`
                              : `All ${preParseStats.keptTotal} rows retained`}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => executePreParseFilter()}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text,
                            display: "flex", alignItems: "center", gap: 4
                          }}
                        >
                          ⚡ Apply Pre-Parse Filters
                        </button>
                        <button
                          onClick={() => setShowPreParsePanel(!showPreParsePanel)}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: showPreParsePanel ? C.blue.bg : C.bg1,
                            border: `1px solid ${showPreParsePanel ? C.blue.border : C.border1}`,
                            color: showPreParsePanel ? C.blue.text : C.text1
                          }}
                        >
                          {showPreParsePanel ? "Hide Filters" : "⚙ Pre-Parse Filter Options"}
                        </button>
                      </div>
                    </div>

                    {showPreParsePanel && (
                      <div style={{
                        marginTop: 10, padding: 12, background: C.bg0, border: `1px solid ${C.border1}`, borderRadius: 8
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text1, marginBottom: 10 }}>
                          Configure Filters to Apply Before Parsing & Mapping:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: 11, color: C.text0 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              ⬆️ Skip Top Header Lines
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={preParseOptions.skipTopRows}
                              onChange={e => setPreParseOptions({ ...preParseOptions, skipTopRows: parseInt(e.target.value) || 0 })}
                              style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              ⬇️ Skip Bottom Footer Lines
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={preParseOptions.skipBottomRows}
                              onChange={e => setPreParseOptions({ ...preParseOptions, skipBottomRows: parseInt(e.target.value) || 0 })}
                              style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              🚫 Exclude Keywords (comma-sep)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. TOTAL, ANNULE, CANCELLED"
                              value={preParseOptions.excludeKeywords}
                              onChange={e => setPreParseOptions({ ...preParseOptions, excludeKeywords: e.target.value })}
                              style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              🎯 Include Only Keywords
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. OF-, PO-, 2026"
                              value={preParseOptions.includeKeywords}
                              onChange={e => setPreParseOptions({ ...preParseOptions, includeKeywords: e.target.value })}
                              style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              🔢 Max Rows Limit (0 = all)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={preParseOptions.maxRows}
                              onChange={e => setPreParseOptions({ ...preParseOptions, maxRows: parseInt(e.target.value) || 0 })}
                              style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.text2, marginBottom: 4 }}>
                              📊 Column Match Filter
                            </label>
                            <div style={{ display: "flex", gap: 4 }}>
                              <select
                                value={preParseOptions.columnFilterField}
                                onChange={e => setPreParseOptions({ ...preParseOptions, columnFilterField: e.target.value })}
                                style={{ width: "50%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 4px", borderRadius: 6, fontSize: 10 }}
                              >
                                <option value="">Any Column</option>
                                {headers.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Match value"
                                value={preParseOptions.columnFilterValue}
                                onChange={e => setPreParseOptions({ ...preParseOptions, columnFilterValue: e.target.value })}
                                style={{ width: "50%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 6px", borderRadius: 6, fontSize: 10 }}
                              />
                            </div>
                          </div>
                        </div>
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button
                            onClick={() => {
                              const resetOpts = {
                                skipTopRows: 0,
                                skipBottomRows: 0,
                                excludeKeywords: "",
                                includeKeywords: "",
                                maxRows: 0,
                                columnFilterField: "",
                                columnFilterValue: ""
                              };
                              setPreParseOptions(resetOpts);
                              executePreParseFilter(resetOpts);
                            }}
                            style={{
                              padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                              background: C.bg1, border: `1px solid ${C.border1}`, color: C.text1
                            }}
                          >
                            ↺ Reset Filters
                          </button>
                          <button
                            onClick={() => executePreParseFilter()}
                            style={{
                              padding: "5px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text
                            }}
                          >
                            ⚡ Filter Raw Data Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clean Data Before Mapping Bar */}
                  <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border0}`, background: C.bg3 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text0 }}>🧹 Data Cleaning Before Mapping:</span>
                        {cleanStats && (
                          <span style={{ fontSize: 11, color: C.green.text, background: C.green.bg, border: `1px solid ${C.green.border}`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                            Cleaned ({cleanStats.trimmedCount} trimmed, {cleanStats.decimalCount} decimals, {cleanStats.dateCount} dates, {cleanStats.emptyRowsRemoved} empty/dupes removed)
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => executeDataCleaning()}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: C.green.bg, border: `1px solid ${C.green.border}`, color: C.green.text,
                            display: "flex", alignItems: "center", gap: 4
                          }}
                        >
                          ✨ Re-Run Data Cleaning
                        </button>
                        <button
                          onClick={() => setShowCleanPanel(!showCleanPanel)}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: showCleanPanel ? C.blue.bg : C.bg1,
                            border: `1px solid ${showCleanPanel ? C.blue.border : C.border1}`,
                            color: showCleanPanel ? C.blue.text : C.text1
                          }}
                        >
                          {showCleanPanel ? "Close Rules" : "⚙ Data Cleaning Options"}
                        </button>
                      </div>
                    </div>

                    {showCleanPanel && (
                      <div style={{
                        marginTop: 10, padding: 12, background: C.bg0, border: `1px solid ${C.border1}`, borderRadius: 8
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text1, marginBottom: 8 }}>
                          Pre-Mapping Automated Cleaning Rules:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, fontSize: 11, color: C.text0 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.trimWhitespace}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, trimWhitespace: e.target.checked })}
                            />
                            Trim Whitespace & Quotes
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.fixDecimals}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, fixDecimals: e.target.checked })}
                            />
                            French Decimals (12,5 → 12.5) & €/$
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.standardizeDates}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, standardizeDates: e.target.checked })}
                            />
                            Standardize Dates (DD/MM/YYYY → YYYY-MM-DD)
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.removeEmptyRows}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, removeEmptyRows: e.target.checked })}
                            />
                            Purge Entirely Blank Rows
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.removeDuplicates}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, removeDuplicates: e.target.checked })}
                            />
                            Remove Duplicate Rows
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={cleaningOptions.sanitizeHeaders}
                              onChange={e => setCleaningOptions({ ...cleaningOptions, sanitizeHeaders: e.target.checked })}
                            />
                            Sanitize Column Header Names
                          </label>
                        </div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => executeDataCleaning()}
                            style={{
                              padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text
                            }}
                          >
                            Apply Rules & Clean Raw Data Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Template Models Selector & Mapping Bar */}
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border0}`, background: C.bg2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text0 }}>📐 Template Model:</span>
                        <select
                          value={selectedTemplateId}
                          onChange={e => handleSelectTemplate(e.target.value)}
                          style={{
                            background: C.bg0, border: `1px solid ${C.blue.border}`, color: C.blue.text,
                            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer"
                          }}
                        >
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowSaveModelInput(!showSaveModelInput)}
                          style={{
                            padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: C.bg3, border: `1px solid ${C.border1}`, color: C.text0
                          }}
                        >
                          💾 Save as Model
                        </button>
                        {templates.length > 1 && (
                          <button
                            onClick={() => handleDeleteModel(selectedTemplateId)}
                            style={{
                              padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                              background: C.red.bg, border: `1px solid ${C.red.border}`, color: C.red.text
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setShowColumnToggle(!showColumnToggle)}
                          style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: showColumnToggle ? C.blue.bg : C.bg3,
                            border: `1px solid ${showColumnToggle ? C.blue.border : C.border1}`,
                            color: showColumnToggle ? C.blue.text : C.text1
                          }}
                        >
                          👁️ Show/Hide Columns ({headers.length - hiddenColumns.length}/{headers.length})
                        </button>
                        <button
                          onClick={() => setShowMappingEditor(!showMappingEditor)}
                          style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: showMappingEditor ? C.blue.bg : C.bg3,
                            border: `1px solid ${showMappingEditor ? C.blue.border : C.border1}`,
                            color: showMappingEditor ? C.blue.text : C.text1,
                          }}
                        >
                          {showMappingEditor ? "Close Editor" : "⚙ Edit Column Mappings"}
                        </button>
                      </div>
                    </div>

                    {showSaveModelInput && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          placeholder="Model Name (e.g. Model 3 - Dassault Variant)"
                          value={newModelName}
                          onChange={e => setNewModelName(e.target.value)}
                          style={{
                            background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0,
                            padding: "6px 12px", borderRadius: 6, fontSize: 12, width: 260
                          }}
                        />
                        <button
                          onClick={handleSaveModel}
                          style={{
                            padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                            background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text, cursor: "pointer"
                          }}
                        >
                          Confirm Save
                        </button>
                      </div>
                    )}

                    {/* Column Show/Hide Toggle Box */}
                    {showColumnToggle && (
                      <div style={{
                        marginTop: 12, padding: 12, background: C.bg0, border: `1px solid ${C.border1}`,
                        borderRadius: 8
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.text1 }}>
                            Select Columns to Display:
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => setHiddenColumns([])}
                              style={{ fontSize: 10, color: C.blue.text, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                            >
                              Show All
                            </button>
                            <button
                              onClick={() => setHiddenColumns(headers.filter(h => !resolveHeliosField(h, customMappings)))}
                              style={{ fontSize: 10, color: C.orange.text, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                            >
                              Hide Unmapped
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 120, overflowY: "auto" }}>
                          {headers.map(h => {
                            const isHidden = hiddenColumns.includes(h);
                            return (
                              <label
                                key={h}
                                style={{
                                  display: "flex", alignItems: "center", gap: 5, padding: "3px 8px",
                                  borderRadius: 4, background: isHidden ? C.bg2 : C.bg3,
                                  border: `1px solid ${isHidden ? C.border0 : C.border1}`,
                                  fontSize: 11, cursor: "pointer", opacity: isHidden ? 0.5 : 1,
                                  color: C.text0, fontFamily: "'DM Mono', monospace"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!isHidden}
                                  onChange={() => toggleColumnVisibility(h)}
                                />
                                {h}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detected headers & Re-mapping controls */}
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border0}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text1 }}>
                        Detected Columns & Mapping ({headers.filter(h => !hiddenColumns.includes(h)).length}/{headers.length} Visible):
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="🔍 Search column names..."
                          value={headerNameSearch}
                          onChange={e => setHeaderNameSearch(e.target.value)}
                          style={{
                            background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0,
                            padding: "4px 8px", borderRadius: 6, fontSize: 11, outline: "none", width: 180
                          }}
                        />
                      </div>
                    </div>

                    {!showMappingEditor ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {headers
                          .filter(h => !hiddenColumns.includes(h))
                          .filter(h => !headerNameSearch || h.toLowerCase().includes(headerNameSearch.toLowerCase()))
                          .map(h => {
                            const mapped = resolveHeliosField(h, customMappings);
                            return (
                              <div key={h} style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "3px 9px", borderRadius: 5, fontSize: 11,
                                background: mapped ? C.green.bg : C.bg3,
                                border: `1px solid ${mapped ? C.green.border : C.border0}`,
                                color: mapped ? C.green.text : C.text1,
                                fontFamily: "'DM Mono', monospace",
                              }}>
                                <span>{h}</span>
                                {mapped && <span style={{ color: C.text2, fontSize: 10 }}>→ {mapped}</span>}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, marginTop: 8 }}>
                        {headers
                          .filter(h => !headerNameSearch || h.toLowerCase().includes(headerNameSearch.toLowerCase()))
                          .map(h => {
                            const currentMapped = resolveHeliosField(h, customMappings) || "IGNORE";
                            const isHidden = hiddenColumns.includes(h);
                            return (
                              <div key={h} style={{
                                background: C.bg2,
                                border: `1px solid ${C.border0}`,
                                borderRadius: 6, padding: "6px 10px",
                                display: "flex", flexDirection: "column", gap: 4, opacity: isHidden ? 0.5 : 1
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text0, fontFamily: "'DM Mono', monospace" }}>
                                    {h}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleColumnVisibility(h)}
                                    style={{ fontSize: 10, background: "none", border: "none", cursor: "pointer", color: isHidden ? C.blue.text : C.text2 }}
                                  >
                                    {isHidden ? "Show" : "Hide"}
                                  </button>
                                </div>
                                <select
                                  value={currentMapped}
                                  onChange={e => handleRemapColumn(h, e.target.value)}
                                  style={{
                                    background: C.bg0, border: `1px solid ${C.border1}`, color: C.text0,
                                    borderRadius: 4, padding: "4px 6px", fontSize: 11, outline: "none"
                                  }}
                                >
                                  {TARGET_FIELDS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border0}`, background: C.bg2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text0 }}>🧠 Smart Column Analytics & Filters:</span>
                        <span style={{ fontSize: 11, color: C.blue.text, background: C.blue.bg, border: `1px solid ${C.blue.border}`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                          {smartFilteredRows.length} of {rawBlob.length} rows matched
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => setShowSmartFilterPanel(!showSmartFilterPanel)}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: showSmartFilterPanel ? C.blue.bg : C.bg1,
                            border: `1px solid ${showSmartFilterPanel ? C.blue.border : C.border1}`,
                            color: showSmartFilterPanel ? C.blue.text : C.text1
                          }}
                        >
                          {showSmartFilterPanel ? "Hide Smart Filters" : "⚙ Smart Filters & Analytics"}
                        </button>
                      </div>
                    </div>

                    {showSmartFilterPanel && (
                      <div style={{
                        marginTop: 10, padding: 12, background: C.bg0, border: `1px solid ${C.border1}`, borderRadius: 8
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text1, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <span>Smart Column Selection & Drop-down Filters:</span>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, alignItems: "center" }}>
                            <span>/Crée par Col:
                              <select
                                value={columnAnalytics.creatorCol}
                                onChange={e => setColumnOverrides({ ...columnOverrides, creatorCol: e.target.value })}
                                style={{ marginLeft: 4, background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, borderRadius: 4, padding: "2px 4px", fontSize: 10 }}
                              >
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </span>
                            <span>PROG Col:
                              <select
                                value={columnAnalytics.progCol}
                                onChange={e => setColumnOverrides({ ...columnOverrides, progCol: e.target.value })}
                                style={{ marginLeft: 4, background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, borderRadius: 4, padding: "2px 4px", fontSize: 10 }}
                              >
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </span>
                            <span>Statut Col:
                              <select
                                value={columnAnalytics.statutCol}
                                onChange={e => setColumnOverrides({ ...columnOverrides, statutCol: e.target.value })}
                                style={{ marginLeft: 4, background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, borderRadius: 4, padding: "2px 4px", fontSize: 10 }}
                              >
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </span>
                            <span>User Col:
                              <select
                                value={columnAnalytics.userCol}
                                onChange={e => setColumnOverrides({ ...columnOverrides, userCol: e.target.value })}
                                style={{ marginLeft: 4, background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, borderRadius: 4, padding: "2px 4px", fontSize: 10 }}
                              >
                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 11, color: C.text0 }}>
                          {!hiddenSmartFilters.creator && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: C.text2 }}>👤 /Crée par Drop List</label>
                                <button onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, creator: true })} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 10 }}>Hide</button>
                              </div>
                              <select
                                value={smartFilters.creator}
                                onChange={e => setSmartFilters({ ...smartFilters, creator: e.target.value })}
                                style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11, outline: "none" }}
                              >
                                <option value="">All /Crée par ({uniqueCreators.length})</option>
                                {uniqueCreators.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {!hiddenSmartFilters.client && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: C.text2 }}>📁 PROG Drop List</label>
                                <button onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, client: true })} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 10 }}>Hide</button>
                              </div>
                              <select
                                value={smartFilters.client}
                                onChange={e => setSmartFilters({ ...smartFilters, client: e.target.value })}
                                style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11, outline: "none" }}
                              >
                                <option value="">All PROG ({uniqueProgs.length})</option>
                                {uniqueProgs.map(cl => (
                                  <option key={cl} value={cl}>{cl}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {!hiddenSmartFilters.program && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: C.text2 }}>📌 Statut Drop List</label>
                                <button onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, program: true })} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 10 }}>Hide</button>
                              </div>
                              <select
                                value={smartFilters.program}
                                onChange={e => setSmartFilters({ ...smartFilters, program: e.target.value })}
                                style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11, outline: "none" }}
                              >
                                <option value="">All Statut ({uniqueStatuts.length})</option>
                                {uniqueStatuts.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {!hiddenSmartFilters.user && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: C.text2 }}>🏷️ User Drop List</label>
                                <button onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, user: true })} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 10 }}>Hide</button>
                              </div>
                              <select
                                value={smartFilters.user}
                                onChange={e => setSmartFilters({ ...smartFilters, user: e.target.value })}
                                style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11, outline: "none" }}
                              >
                                <option value="">All Users ({uniqueUsers.length})</option>
                                {uniqueUsers.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {!hiddenSmartFilters.keyword && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: C.text2 }}>🔍 General Keyword</label>
                                <button onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, keyword: true })} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 10 }}>Hide</button>
                              </div>
                              <input
                                type="text"
                                placeholder="Global keyword..."
                                value={smartFilters.keyword}
                                onChange={e => setSmartFilters({ ...smartFilters, keyword: e.target.value })}
                                style={{ width: "100%", background: C.bg1, border: `1px solid ${C.border1}`, color: C.text0, padding: "5px 8px", borderRadius: 6, fontSize: 11 }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Show / Hide management bar */}
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, borderTop: `1px solid ${C.border0}`, paddingTop: 8, flexWrap: "wrap", gap: 6 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ color: C.text2, fontWeight: 700 }}>Show Filters:</span>
                            {Object.entries(hiddenSmartFilters).map(([key, isHidden]) => (
                              isHidden ? (
                                <button
                                  key={key}
                                  onClick={() => setHiddenSmartFilters({ ...hiddenSmartFilters, [key]: false })}
                                  style={{ background: C.bg1, border: `1px solid ${C.border1}`, color: C.text1, padding: "2px 6px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}
                                >
                                  + {key}
                                </button>
                              ) : null
                            ))}
                          </div>
                          <button
                            onClick={() => setSmartFilters({ creator: "", client: "", program: "", user: "", keyword: "" })}
                            style={{ background: C.bg1, border: `1px solid ${C.border1}`, color: C.text1, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}
                          >
                            ↺ Reset Smart Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Raw preview table */}
                  <div style={{ padding: "12px 18px", overflowX: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Raw Data Preview ({smartFilteredRows.length} records ready)
                      </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr>
                          {headers.filter(h => !hiddenColumns.includes(h)).map(h => {
                            const mapped = resolveHeliosField(h, customMappings);
                            return (
                              <th key={h} style={{
                                padding: "8px 10px", textAlign: "left",
                                color: C.text0,
                                background: C.bg2,
                                borderBottom: `2px solid ${C.border1}`,
                                borderRight: `1px solid ${C.border0}`,
                                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 11,
                                minWidth: 140,
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                                  <span>{h}</span>
                                  {mapped && <span style={{ fontSize: 9, color: C.green.text, background: C.green.bg, padding: "1px 4px", borderRadius: 3 }}>→ {mapped}</span>}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {smartFilteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={headers.filter(h => !hiddenColumns.includes(h)).length} style={{ padding: 20, textAlign: "center", color: C.text2, fontSize: 12 }}>
                              No rows match the current smart filter criteria.
                            </td>
                          </tr>
                        ) : (
                          smartFilteredRows.slice(0, 10).map((row, i) => (
                            <tr key={i} style={{ background: i % 2 ? C.bg2 : "transparent" }}>
                              {headers.filter(h => !hiddenColumns.includes(h)).map(h => (
                                <td key={h} style={{
                                  padding: "6px 10px", color: C.text1,
                                  borderBottom: `1px solid ${C.border0}40`,
                                  borderRight: `1px solid ${C.border0}20`,
                                  fontFamily: "'DM Mono', monospace",
                                  maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{String(row[h] ?? "—")}</td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {smartFilteredRows.length > 10 && (
                      <div style={{ marginTop: 6, fontSize: 10, color: C.text2, fontStyle: "italic", textAlign: "right" }}>
                        Showing first 10 rows of {smartFilteredRows.length} filtered records.
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border0}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: C.text1 }}>
                      {smartFilteredRows.length !== rawBlob.length ? (
                        <span style={{ color: C.blue.text, fontWeight: 700 }}>
                          ⚡ Smart Filter active: {smartFilteredRows.length} of {rawBlob.length} rows will be normalized.
                        </span>
                      ) : (
                        <span>Normalizing full dataset ({rawBlob.length} rows).</span>
                      )}
                    </div>
                    <button onClick={runNormalize} style={{
                      padding: "8px 22px", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: C.blue.bg, border: `1px solid ${C.blue.border}`, color: C.blue.text,
                    }}>
                      ⚙ Normalize {smartFilteredRows.length} rows →
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
                          {["Order ID", "Part Ref", "Designation", "Qty", "Est Hrs", "Planned Start", "Planned End", "Status", "Issues"].map(h => (
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
                                {row.erp_order_id || <span style={{ color: C.red.text }}>MISSING</span>}
                              </td>
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text1 }}>
                                {row.part_reference || "—"}
                              </td>
                              <td style={{ padding: "9px 12px", color: C.text0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row.designation || "—"}
                              </td>
                              <td style={{ padding: "9px 12px", color: C.text1 }}>{row.quantity || "—"}</td>
                              <td style={{ padding: "9px 12px", color: C.text0, fontWeight: 600 }}>{row.estimated_load_hours || "—"}h</td>
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text1 }}>{row.planned_start_at || "—"}</td>
                              <td style={{ padding: "9px 12px", fontFamily: "'DM Mono', monospace", color: C.text1 }}>{row.planned_end_at || "—"}</td>
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
