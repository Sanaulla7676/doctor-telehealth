import fs from "node:fs";

const server = fs.readFileSync("server.js", "utf8");
const bootstrap = fs.readFileSync("security-bootstrap.js", "utf8");

const checks = [
  {
    id: "security-bootstrap",
    ok: bootstrap.includes("CORS_ORIGINS") && bootstrap.includes("JWT_SECRET") && bootstrap.includes("BOOTSTRAP_DOCTOR"),
    message: "Production startup must pass through the security bootstrap."
  },
  {
    id: "wildcard-cors",
    ok: !/origin\s*:\s*["']\*["']/.test(server) || bootstrap.includes("process.env.CORS_ORIGINS"),
    message: "Production CORS must be constrained by CORS_ORIGINS."
  },
  {
    id: "default-doctor-password",
    ok: !/drvarsha@07/.test(server) || bootstrap.includes("process.env.DOCTOR_PASSWORD"),
    message: "Doctor provisioning must use deployment-managed credentials."
  },
  {
    id: "reset-token-logging",
    ok: !/console\.log\(\[`?\[Password Reset\]/.test(server) || bootstrap.includes("token intentionally not logged"),
    message: "Password reset tokens must never be logged."
  },
  {
    id: "oversized-json",
    ok: !/express\.json\(\{\s*limit:\s*['\"]50mb['\"]/.test(server) || bootstrap.includes("JSON_BODY_LIMIT"),
    message: "Global request body limits must be constrained."
  },
  {
    id: "readiness-endpoints",
    ok: bootstrap.includes("/health") && bootstrap.includes("/ready"),
    message: "Health and readiness endpoints must exist for deployment checks."
  }
];

const failures = checks.filter((check) => !check.ok);

if (failures.length) {
  console.error("Production security audit failed:");
  for (const failure of failures) console.error(`- ${failure.id}: ${failure.message}`);
  process.exit(1);
}

console.log("Production security static audit passed.");
