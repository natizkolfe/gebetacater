/**
 * One-shot: copy TWILIO_* Messaging vars from Sabu API Railway service to gebetacater.
 * Prints only key names / yes|no — never secret values.
 *
 * Usage (from repo root, Railway CLI logged in):
 *   node scripts/copy-twilio-from-sabu.mjs
 */
import { spawnSync } from "node:child_process";

const KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];
const SABU_PROJECT = "b9928c8e-0764-4d88-b3db-48979dca274e";
const SABU_SERVICE = "@sabu/api";
const GEBETA_SERVICE = "gebetacater";
const ENV = "production";

function railwayJson(args) {
  const result = spawnSync("railway", [...args, "--json"], {
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `railway ${args.join(" ")} failed`);
  }
  return JSON.parse(result.stdout);
}

function setVar(name, value) {
  const result = spawnSync(
    "railway",
    ["variable", "set", name, "--stdin", "-s", GEBETA_SERVICE, "-e", ENV],
    { input: value, encoding: "utf8", shell: true },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `failed to set ${name}`);
  }
}

const sabu = railwayJson([
  "variables",
  "-p",
  SABU_PROJECT,
  "-s",
  SABU_SERVICE,
  "-e",
  ENV,
]);

const missing = KEYS.filter((key) => !String(sabu[key] ?? "").trim());
if (missing.length) {
  console.error(`Missing on Sabu API: ${missing.join(", ")}`);
  process.exit(2);
}

for (const key of KEYS) {
  setVar(key, String(sabu[key]).trim());
  console.log(`Set ${key} on ${GEBETA_SERVICE}`);
}

const gebeta = railwayJson(["variables", "-s", GEBETA_SERVICE, "-e", ENV]);
console.log(
  KEYS.concat("PUBLIC_APP_URL")
    .map((key) => `${key}:${gebeta[key] ? "yes" : "no"}`)
    .join(" "),
);
