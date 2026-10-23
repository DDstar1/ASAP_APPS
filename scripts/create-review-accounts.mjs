#!/usr/bin/env node
// Creates (or resets) the two accounts App Store and Google Play reviewers sign in with:
//   customer  a normal customer, as if they signed up in the customer app
//   rider     a driver with a bike set up, as if they finished signup + driver setup
// It follows the apps' own signup steps: Supabase Auth user → app_custom_users row →
// Rust account (/admin/create-riders or /admin/create-drivers, as that user). Running it
// again keeps the accounts and gives them new passwords. Prints the credentials at the end.
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-review-accounts.mjs
//
// SUPABASE_URL, SUPABASE_ANON_KEY and RUST_API_URL come from the repo-root .env (or the
// environment). RUST_API_URL defaults to http://localhost:8081; that server needs
// SUPABASE_JWT_SECRET set, or every call is rejected with 401. The service role key is
// only read from the environment: never put it in .env, an app, or the repo.

import { randomBytes, randomInt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Reviewers who call the phone number reach ASAP support
const SUPPORT_PHONE = "+2347042036840";

const ACCOUNTS = [
  {
    kind: "customer",
    email: "asap.support.team+review-customer@gmail.com",
    username: "review_customer",
    name: "App Review Customer",
    phone: SUPPORT_PHONE,
  },
  {
    kind: "rider",
    email: "asap.support.team+review-rider@gmail.com",
    username: "review_rider",
    name: "App Review Rider",
    phone: SUPPORT_PHONE,
  },
];

// ---------- config ----------

function loadRootEnv() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const [, key, raw = ""] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadRootEnv();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUST_URL = (process.env.RUST_API_URL || "http://localhost:8081").replace(/\/$/, "");

for (const [name, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY })) {
  if (!value) {
    console.error(`Missing ${name}. See the comment at the top of this script.`);
    process.exit(1);
  }
}

// ---------- helpers ----------

// 16 random characters plus a fixed suffix so it always has upper, lower, digit and symbol
const newPassword = () => `${randomBytes(12).toString("base64url")}Aa1!`;

const pick = (alphabet, n) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");

// Same formats driver-setup issues for bikes: "ASP-123AB" and "ASP" + 9 digits
const vehicleId = () => `ASP-${pick("0123456789", 3)}${pick("ABCDEFGHJKLMNPQRSTUVWXYZ", 2)}`;
const licenseNo = () => `ASP${pick("0123456789", 9)}`;

async function call(url, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

const fail = (step, r) => {
  const detail = typeof r.data === "string" ? r.data : r.data?.msg ?? r.data?.message ?? r.data?.error ?? JSON.stringify(r.data);
  throw new Error(`${step} failed (${r.status}): ${detail}`);
};

const admin = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function findUserByEmail(email) {
  for (let page = 1; page <= 50; page++) {
    const r = await call(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: admin });
    if (!r.ok) fail("Listing users", r);
    const users = r.data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < 200) return null;
  }
  return null;
}

// Auth user with a confirmed email, so no confirmation mail is needed; reuses an existing one
async function upsertAuthUser(account, password) {
  const created = await call(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: { email: account.email, password, email_confirm: true },
  });
  if (created.ok) return { id: created.data.id, isNew: true };

  const existing = await findUserByEmail(account.email);
  if (!existing) fail("Creating the auth user", created);
  const updated = await call(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers: admin,
    body: { password, email_confirm: true },
  });
  if (!updated.ok) fail("Resetting the password", updated);
  return { id: existing.id, isNew: false };
}

async function upsertProfile(account, userId) {
  const r = await call(`${SUPABASE_URL}/rest/v1/app_custom_users?on_conflict=id`, {
    method: "POST",
    headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: [{
      id: userId,
      username: account.username,
      phone: account.phone,
      // Customers keep the column's default, as in the customer app's signup
      ...(account.kind === "rider" && { custom_role: "rider" }),
    }],
  });
  if (!r.ok) fail("Saving app_custom_users", r);
}

async function signIn(account, password) {
  const r = await call(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY },
    body: { email: account.email, password },
  });
  if (!r.ok) fail("Signing in", r);
  return r.data.access_token;
}

// The Rust leg of signup, called as the user, like the apps. Rust skips rows that already exist.
async function createRustAccount(account, token) {
  const isRider = account.kind === "rider";
  const r = await call(`${RUST_URL}/admin/${isRider ? "create-drivers" : "create-riders"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: isRider
      ? {
          name: account.name, email: account.email, phone: account.phone,
          vehicle_type: "Bike", vehicle: null,
          license_number: licenseNo(), plate_number: vehicleId(),
          account_number: null, bank_code: null,
        }
      : { name: account.name, email: account.email, phone: account.phone },
  });
  if (r.status === 401) {
    throw new Error(`Rust at ${RUST_URL} rejected the sign-in (401). Set SUPABASE_JWT_SECRET for the Rust server and restart it.`);
  }
  if (!r.ok) fail(`Rust ${isRider ? "create-drivers" : "create-riders"}`, r);
  return r.data?.message ?? "ok";
}

// ---------- run ----------

const results = [];
for (const account of ACCOUNTS) {
  const password = newPassword();
  process.stdout.write(`${account.kind}: `);
  try {
    const { id, isNew } = await upsertAuthUser(account, password);
    await upsertProfile(account, id);
    const token = await signIn(account, password);
    const rust = await createRustAccount(account, token);
    console.log(`${isNew ? "created" : "already existed, password reset"} · Rust: ${rust}`);
    results.push({ app: account.kind === "rider" ? "ASAP Rider" : "ASAP Customer", email: account.email, password });
  } catch (e) {
    console.log("FAILED");
    console.error(`  ${e.message}`);
    process.exitCode = 1;
  }
}

if (results.length) {
  console.log("\nReviewer sign-in details (enter them in App Store Connect and the Play Console):\n");
  for (const r of results) console.log(`  ${r.app.padEnd(14)} ${r.email}\n  ${"".padEnd(14)} ${r.password}\n`);
  console.log("These passwords aren't saved anywhere. Running the script again replaces them.");
}
