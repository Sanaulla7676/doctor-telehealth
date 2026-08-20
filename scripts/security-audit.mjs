import fs from "node:fs";

const server = fs.readFileSync("server.js", "utf8");
const checks = [
  {
    id: "wildcard-cors",
    pattern: /origin\s*:\s*["']\*["']/,
    message: "Production CORS must not use a wildcard origin."
  },
  {
    id: "default-doctor-password",
    pattern: /drvarsha@07/,
    message: "Default doctor credentials must not exist in runtime source."
  },
  {
    id: "reset-token-logging",
    pattern: /console\.log\(\[`?\[Password Reset\]/,
    message: "Password reset tokens must never be logged."
  },
  {
    id: "oversized-json",
    pattern: /express\.json\(\{\s*limit:\s*['\"]50mb['\"]/, 
    message: "Global request body limits should be constrained and endpoint-specific."
  }
];

const failures = checks.filter(({ pattern }) => pattern.test(server));

if (failures.length) {
  console.error("Production security audit failed:");
  for (const failure of failures) console.error(`- ${failure.id}: ${failure.message}`);
  process.exit(1);
}

console.log("Production security static audit passed.");
