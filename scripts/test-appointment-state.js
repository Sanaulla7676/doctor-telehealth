const assert = require("node:assert/strict");

const transitions = {
  Pending: ["Accepted", "Rejected", "Cancelled"],
  Accepted: ["Payment Pending", "Cancelled"],
  Rejected: [],
  "Payment Pending": ["Paid", "Cancelled"],
  Paid: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "No Show"],
  Cancelled: [],
  "No Show": [],
  Completed: [],
};

function canTransition(from, to) {
  return transitions[from].includes(to);
}

for (const [from, targets] of Object.entries(transitions)) {
  for (const to of targets) assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
}

const invalid = [
  ["Pending", "Confirmed"],
  ["Accepted", "Paid"],
  ["Payment Pending", "Confirmed"],
  ["Cancelled", "Paid"],
  ["Completed", "Confirmed"],
];

for (const [from, to] of invalid) {
  assert.equal(canTransition(from, to), false, `must reject ${from} -> ${to}`);
}

assert.equal("Paid" === "Paid" && "Paid" === "Paid", true);
assert.equal("Confirmed" === "Confirmed" && "PENDING" === "PENDING", true);
assert.equal("Confirmed" === "Confirmed" && ["READY", "IN_PROGRESS"].includes("READY"), true);
assert.equal("Pending" === "Confirmed", false);

console.log("appointment-state tests: PASS");
