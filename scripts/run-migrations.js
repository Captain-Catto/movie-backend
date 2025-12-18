const { spawnSync } = require("node:child_process");
const { readdirSync, readFileSync, existsSync } = require("node:fs");
const path = require("node:path");

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getConfig(fileEnv) {
  const get = (key, fallbacks = []) => {
    const candidates = [key, ...fallbacks];
    for (const k of candidates) {
      const fromProcess = process.env[k];
      if (fromProcess !== undefined && fromProcess !== "") return fromProcess;
      const fromFile = fileEnv[k];
      if (fromFile !== undefined && fromFile !== "") return fromFile;
    }
    return undefined;
  };

  return {
    host: get("DATABASE_HOST", ["DB_HOST"]),
    port: get("DATABASE_PORT", ["DB_PORT"]),
    user: get("DATABASE_USERNAME", ["DB_USERNAME"]),
    password: get("DATABASE_PASSWORD", ["DB_PASSWORD"]),
    database: get("DATABASE_NAME", ["DB_DATABASE"]),
  };
}

function ensureConfig(config) {
  const missing = [];
  if (!config.host) missing.push("DATABASE_HOST");
  if (!config.port) missing.push("DATABASE_PORT");
  if (!config.user) missing.push("DATABASE_USERNAME");
  if (!config.password) missing.push("DATABASE_PASSWORD");
  if (!config.database) missing.push("DATABASE_NAME");

  if (missing.length) {
    console.error("Missing database config in .env or environment variables:");
    for (const key of missing) console.error(`- ${key}`);
    process.exit(1);
  }
}

function listMigrationFiles(migrationsDir) {
  const files = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  return files.map((name) => path.join(migrationsDir, name));
}

function ensurePsqlAvailable() {
  const res = spawnSync("psql", ["--version"], { stdio: "ignore" });
  if (res.error || res.status !== 0) {
    console.error("psql command not found. Please install PostgreSQL client and add it to PATH.");
    process.exit(1);
  }
}

function runMigration(filePath, config) {
  const args = [
    "-v",
    "ON_ERROR_STOP=1",
    "-h",
    String(config.host),
    "-p",
    String(config.port),
    "-U",
    String(config.user),
    "-d",
    String(config.database),
    "-f",
    filePath,
  ];

  const res = spawnSync("psql", args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PGPASSWORD: String(config.password),
    },
  });

  if (res.error || res.status !== 0) {
    const code = res.status ?? 1;
    console.error(`Migration failed: ${path.basename(filePath)} (exit code ${code})`);
    process.exit(code);
  }
}

function main() {
  const repoRoot = process.cwd();
  const envPath = path.join(repoRoot, ".env");
  const migrationsDir = path.join(repoRoot, "migrations");

  if (!existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const fileEnv = loadEnvFile(envPath);
  const config = getConfig(fileEnv);
  ensureConfig(config);
  ensurePsqlAvailable();

  const files = listMigrationFiles(migrationsDir);
  if (!files.length) {
    console.log("No migration files found.");
    return;
  }

  console.log("Running migrations:");
  console.log(`- Database: ${config.database}`);
  console.log(`- Host: ${config.host}:${config.port}`);
  console.log(`- User: ${config.user}`);
  console.log(`- Files: ${files.length}`);
  console.log("");

  for (const filePath of files) {
    console.log(`==> ${path.basename(filePath)}`);
    runMigration(filePath, config);
    console.log("");
  }

  console.log("All migrations completed successfully.");
}

main();

