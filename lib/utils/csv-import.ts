export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  fields.push(current.trim());
  return fields.map((field) => field.replace(/^"|"$/g, "").trim());
}

export function parseCsv(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => splitCsvLine(line));
  return { headers, rows };
}

export function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}
