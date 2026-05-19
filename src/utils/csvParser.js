function parseLine(line) {
  const result = [];
  let inQuotes = false;
  let current = "";
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || "").replace(/^"|"$/g, ""); });
    return row;
  });
}

export function mapRow(row) {
  function get(...keys) {
    for (const k of keys) {
      if (row[k] && row[k].trim()) return row[k].trim();
    }
    return "";
  }

  let name = get("name", "full_name", "display name");
  if (!name) {
    const first = get("first_name");
    const last = get("last_name");
    if (first || last) name = [first, last].filter(Boolean).join(" ");
  }

  let street = get("street", "address_line_1", "address line 1", "addr1", "address");
  const line2 = get("address_line_2", "address line 2", "addr2");
  if (street && line2) street = `${street}, ${line2}`;

  return {
    id: Math.random().toString(36).slice(2),
    name,
    street,
    city: get("city"),
    state: get("state"),
    zip: get("zip", "postal_code", "zip_code", "zip code", "postcode", "postal"),
    country: get("country"),
    label: get("label", "company_name", "company", "tags", "notes"),
  };
}
