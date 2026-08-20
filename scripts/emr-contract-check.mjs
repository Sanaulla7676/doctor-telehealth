import fs from "node:fs";

const requiredFiles = [
  "emr-api.js",
  "telehealth-api.js",
  "ops-api.js",
  "migrations/003_emr_clinical.sql",
  "frontend/app/doctor/clinical/page.tsx",
];

const requiredRoutes = [
  "/api/doctor/patients/:patientId",
  "/api/doctor/appointments/:appointmentId/clinical-note",
  "/api/doctor/appointments/:appointmentId/prescription",
  "/api/doctor/followups",
  "/api/patient/clinical-records",
  "/api/patient/followups",
  "/api/doctor/appointments/:appointmentId/join",
  "/api/patient/appointments/:appointmentId/join",
  "/api/doctor/appointments/:appointmentId/complete-consultation",
  "/api/patient/appointments/:appointmentId/cancel",
  "/api/internal/followup-reminders/run",
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));
if (missingFiles.length) {
  console.error("Missing EMR production files:");
  missingFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const source = ["emr-api.js", "telehealth-api.js", "ops-api.js"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
const missingRoutes = requiredRoutes.filter((route) => !source.includes(route));
if (missingRoutes.length) {
  console.error("Missing required EMR/telehealth routes:");
  missingRoutes.forEach((route) => console.error(`- ${route}`));
  process.exit(1);
}

console.log("EMR contract check passed.");
