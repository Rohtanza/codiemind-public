const DEFAULT_TIMEOUT_MS = 5000;

function buildPayload(firstName, lastName) {
  const payload = {
    first_name: firstName,
    last_name: lastName,
    timeout_ms: DEFAULT_TIMEOUT_MS,
  };
  return payload;
}

module.exports = { buildPayload };
