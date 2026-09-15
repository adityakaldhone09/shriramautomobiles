import fs from 'node:fs';
import path from 'node:path';

function normalizeVehicles() {
  const filePath = path.resolve(process.cwd(), 'data/vehicles/vehicle_models.csv');
  if (!fs.existsSync(filePath)) {
    console.error('vehicle_models.csv not found');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0];
  const rows = lines.slice(1).map((line) => {
    const parts = line.split(',');
    return parts.map((p) => p.trim()).join(',');
  });

  fs.writeFileSync(filePath, [headers, ...rows].join('\n') + '\n');
  console.log(`Normalized ${rows.length} vehicle models.`);
}

normalizeVehicles();
