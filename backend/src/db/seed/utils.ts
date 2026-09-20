import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    return row;
  });
}

export function resolveDataPath(relativeDataPath: string): string | null {
  const candidates = [
    path.resolve(__dirname, '../../../../../data', relativeDataPath),
    path.resolve(__dirname, '../../../../data', relativeDataPath),
    path.resolve(__dirname, '../../../data', relativeDataPath),
    path.resolve(process.cwd(), 'data', relativeDataPath),
    path.resolve(process.cwd(), '../data', relativeDataPath),
    path.resolve(process.cwd(), '../../data', relativeDataPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
