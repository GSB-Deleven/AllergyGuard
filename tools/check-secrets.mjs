#!/usr/bin/env node
// Fails (exit code 1) if something that looks like an API key or password is in the repository.
// Runs automatically in GitHub Actions on every push. Keys belong in encrypted secrets, never in code.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["Google/Gemini API-Key", /AIza[0-9A-Za-z_-]{35}/],
  ["Anthropic API-Key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API-Key", /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["GitHub-Token", /gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}/],
  ["Supabase/JWT service key", /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{40,}/],
  ["Privater Schlüssel", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Slack-Token", /xox[abpr]-[A-Za-z0-9-]{10,}/],
];

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/^vendor\/|^fonts\/|\.(png|jpg|gz|woff2|wasm)$/.test(f));

let found = 0;
for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  for (const [name, re] of PATTERNS) {
    if (re.test(text)) { console.error(`✗ ${f}: sieht aus wie ein ${name}`); found++; }
  }
}
if (found) {
  console.error(`\n${found} mögliche(r) Schlüssel gefunden. Bitte entfernen und den Schlüssel beim Anbieter sperren/erneuern.`);
  process.exit(1);
}
console.log(`✓ ${files.length} Dateien geprüft, keine Schlüssel gefunden.`);
