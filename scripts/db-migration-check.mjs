import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('migrations');
const files = fs.readdirSync(dir)
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (files.length === 0) {
  console.error('No versioned SQL migrations found.');
  process.exit(1);
}

const seen = new Set();
for (const file of files) {
  const version = file.split('_')[0];
  if (seen.has(version)) {
    console.error(`Duplicate migration sequence: ${version}`);
    process.exit(1);
  }
  seen.add(version);
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  if (!/CREATE TABLE IF NOT EXISTS schema_migrations/i.test(sql) && !/schema_migrations/i.test(sql)) {
    console.error(`Migration ${file} does not reference schema_migrations; review transaction/version strategy.`);
    process.exit(1);
  }
}

console.log(`✓ ${files.length} versioned migration file(s) validated.`);
