#!/usr/bin/env node
/**
 * Non-interactive Vercel deployment for the Wii monorepo.
 * - creates/updates two projects (web, admin) with the right rootDirectory
 * - syncs env vars from each app's .env.local (production + preview)
 * - prints VERCEL_ORG_ID/VERCEL_PROJECT_ID pairs for the CLI deploy step
 *
 * Uses the token the Vercel CLI stored at login. Never prints secrets.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function findToken() {
  const candidates = [
    path.join(os.homedir(), "Library/Application Support/com.vercel.cli/auth.json"),
    path.join(os.homedir(), ".local/share/com.vercel.cli/auth.json"),
    path.join(os.homedir(), ".vercel/auth.json"),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      if (j.token) return j.token;
    }
  }
  throw new Error("Vercel CLI token not found — login first");
}
const TOKEN = findToken();

async function api(pathname, init = {}) {
  const res = await fetch(`https://api.vercel.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${pathname} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[2] !== "") out[m[1]] = m[2];
  }
  return out;
}

async function ensureProject(name, rootDirectory) {
  let project;
  try {
    project = await api(`/v9/projects/${name}`);
  } catch {
    project = await api(`/v10/projects`, {
      method: "POST",
      body: JSON.stringify({ name, framework: "nextjs", rootDirectory }),
    });
    console.log(`created project ${name}`);
  }
  await api(`/v9/projects/${project.id}`, {
    method: "PATCH",
    body: JSON.stringify({ framework: "nextjs", rootDirectory, serverlessFunctionRegion: "fra1" }),
  });
  return project;
}

async function syncEnv(project, vars) {
  const existing = await api(`/v9/projects/${project.id}/env`);
  const byKey = new Map((existing.envs ?? []).map((e) => [`${e.key}`, e]));
  for (const [key, value] of Object.entries(vars)) {
    const prev = byKey.get(key);
    if (prev) await api(`/v9/projects/${project.id}/env/${prev.id}`, { method: "DELETE" });
    await api(`/v10/projects/${project.id}/env`, {
      method: "POST",
      body: JSON.stringify({
        key,
        value,
        type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
        target: ["production", "preview"],
      }),
    });
  }
  console.log(`${project.name}: ${Object.keys(vars).length} env vars synced`);
}

const user = await api("/v2/user");
const orgId = user.user.defaultTeamId ?? user.user.id;
console.log(`vercel account: ${user.user.email ?? user.user.username}`);

const webEnv = parseEnv("apps/web/.env.local");
const adminEnv = parseEnv("apps/admin/.env.local");

const web = await ensureProject("wii-malta-web", "apps/web");
await syncEnv(web, webEnv);
const admin = await ensureProject("wii-malta-admin", "apps/admin");
await syncEnv(admin, adminEnv);

fs.writeFileSync(
  "/tmp/vercel-projects.json",
  JSON.stringify({ orgId, web: web.id, admin: admin.id }, null, 2)
);
console.log("project ids written to /tmp/vercel-projects.json");
