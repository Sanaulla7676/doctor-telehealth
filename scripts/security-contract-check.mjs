import fs from "node:fs";

const checks = [
  ["password-reset-api", "password-reset-api.js", ["/api/auth/forgot-password", "/api/auth/reset-password", "token_hash"]],
  ["EMR API auth", "emr-api.js", ["verifyDoctor", "verifyPatient"]],
  ["telehealth API auth", "telehealth-api.js", ["doctorAuth", "patientAuth"]],
  ["ops cron secret", "ops-api.js", ["CRON_SECRET", "/api/internal/followup-reminders/run"]],
];

const failures = [];
for (const [id, file, needles] of checks) {
  if (!fs.existsSync(file)) {
    failures.push(`${id}: missing ${file}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!source.includes(needle)) failures.push(`${id}: missing ${needle}`);
  }
}

if (failures.length) {
  console.error("Security contract check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Security contract check passed.");
