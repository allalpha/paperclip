import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import postgres from "postgres";

const BREAKPOINT = "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900";
const connectionString = "postgres://paperclip:paperclip@127.0.0.1:54329/paperclip";
const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Usage: node restore-db.mjs <path-to-backup.sql.gz>");
  process.exit(1);
}

console.log(`Restoring from: ${backupFile}`);

const sql = postgres(connectionString, { max: 1, connect_timeout: 10 });

async function* readStatements() {
  const raw = createReadStream(backupFile);
  const gz = backupFile.endsWith(".gz") ? raw.pipe(createGunzip()) : raw;
  gz.setEncoding("utf8");
  const rl = createInterface({ input: gz, crlfDelay: Infinity });
  let buf = [];
  for await (const line of rl) {
    if (line === BREAKPOINT) {
      const s = buf.join("\n").trim();
      buf = [];
      if (s) yield s;
    } else {
      buf.push(line);
    }
  }
  const s = buf.join("\n").trim();
  if (s) yield s;
  raw.destroy();
}

async function executeCopy(stmt) {
  const lines = stmt.split("\n");
  const ci = lines.findIndex(l => /^COPY\s+/i.test(l));
  if (ci === -1) throw new Error("No COPY line found in block");

  // Normalize: remove trailing semicolon, uppercase stdin
  const copyCmd = lines[ci].replace(/\s*;\s*$/, "").replace(/\bstdin\b/i, "STDIN");
  const dataLines = lines.slice(ci + 1).filter(l => l !== "\\.");

  const writable = await sql.unsafe(copyCmd).writable();
  await new Promise((resolve, reject) => {
    writable.on("error", reject);
    writable.on("finish", resolve);
    for (const line of dataLines) {
      writable.write(line + "\n");
    }
    writable.end();
  });
}

let count = 0;
let errors = 0;

for await (const stmt of readStatements()) {
  try {
    if (/\bCOPY\b.+\bFROM\s+stdin\b/i.test(stmt)) {
      await executeCopy(stmt);
    } else {
      await sql.unsafe(stmt).execute();
    }
    count++;
    process.stdout.write(`\r${count} statements...`);
  } catch (err) {
    errors++;
    const preview = stmt.split("\n").find(l => l.trim() && !l.startsWith("--")) ?? stmt;
    console.error(`\nError: ${preview.slice(0, 120)}`);
    console.error(`  ${err.message}`);
    if (errors > 10) {
      console.error("Too many errors, aborting.");
      break;
    }
  }
}

console.log(`\nDone. ${count} statements, ${errors} errors. Restart Paperclip.`);
await sql.end();
