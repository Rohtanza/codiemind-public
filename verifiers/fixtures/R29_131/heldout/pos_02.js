const REQUIRED = ["DATABASE_URL", "SESSION_SECRET"];

function checkEnv(env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (!env.LOG_LEVEL) {
    console.warn("LOG_LEVEL not set; defaulting to 'info'");
  }
}

module.exports = { checkEnv };
