/* =========================================================
   SILA API  —  by Sila Tech
   ---------------------------------------------------------
   AUTO-LOADING SERVER  (endpoints + pages + live MongoDB)

   • Drop a .js file anywhere inside  silatech/  and it becomes
     an endpoint automatically (no restart needed):
         silatech/ai/talkai.js        ->  GET /ai/talkai
         silatech/image/firelogo.js   ->  GET /image/firelogo
         silatech/tools/weather.js    ->  GET /tools/weather

   • Drop an .html file inside  sila/  (public site) or
     silapanel/  (admin) and it becomes a page automatically:
         sila/pricing.html            ->  /pricing
         silapanel/users.html         ->  /sila/users   (admin only)

   • The admin panel lives ONLY at  /sila  (sign in) and
     /sila/dashboard. Nothing on the public website links there.

   • Everything is real time from MongoDB: every endpoint call,
     every visitor and every API page view is written to the
     database and read back live by the website + admin panel.

   ADMIN LOGIN
   -----------
   The first time you open /sila you create the admin account
   (username + PIN). It is stored in MongoDB, so the login keeps
   working after restarts and does not depend on .env values.
   ADMIN_USERNAME / ADMIN_PIN in .env are optional: if you set
   them, they also work (and create the admin on first sign in).

   Supported endpoint formats
   --------------------------
   1) Express router (current style)
        const router = require("express").Router();
        router.apiInfo = { name, description, method, parameters: [...] };
        router.get("/", (req, res) => { ... });
        module.exports = router;

   2) Plain object
        module.exports = {
          path: "/ai/example",
          method: "get",
          name, description, parameters: [...],
          async handler(req, res) { ... }
        };
========================================================= */

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || "https://api.silatech.site").replace(/\/+$/, "");
const MONGODB_URI = process.env.MONGODB_URI || "";

/* Optional bootstrap credentials (used only if no admin exists in MongoDB) */
const ENV_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ENV_ADMIN_PIN = process.env.ADMIN_PIN || "";

const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; /* 7 days */

const ROOT_DIR = __dirname;
const API_DIR = path.join(ROOT_DIR, "silatech");       /* endpoints   */
const PUBLIC_DIR = path.join(ROOT_DIR, "sila");        /* public site */
const ADMIN_DIR = path.join(ROOT_DIR, "silapanel");    /* admin panel */
const LOGO_FILE = path.join(ROOT_DIR, "silaapi.svg");

const ADMIN_PATH = "/sila";

/* =========================================================
   EXPRESS
========================================================= */

app.set("trust proxy", true);
app.disable("x-powered-by");

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* =========================================================
   DATABASE
========================================================= */

let mongoConnected = false;
let mongoError = "";
let reconnectTimer = null;

mongoose.set("strictQuery", false);

const RequestLog = mongoose.model(
  "RequestLog",
  new mongoose.Schema(
    {
      method: String,
      path: String,
      status: Number,
      success: Boolean,
      responseTime: Number,
      ip: String,
      userAgent: String,
      error: String
    },
    { timestamps: true, versionKey: false }
  )
);

RequestLog.schema.index({ createdAt: -1 });
RequestLog.schema.index({ success: 1, createdAt: -1 });

const Visitor = mongoose.model(
  "Visitor",
  new mongoose.Schema(
    {
      visitorId: { type: String, unique: true, index: true },
      ip: String,
      userAgent: String,
      firstSeen: { type: Date, default: Date.now },
      lastSeen: { type: Date, default: Date.now },
      views: { type: Number, default: 0 }
    },
    { versionKey: false }
  )
);

Visitor.schema.index({ lastSeen: -1 });

/* Admin account (MongoDB backed — fixes login after restarts) */
const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema(
    {
      username: { type: String, unique: true, index: true },
      pinHash: String,
      salt: String,
      createdAt: { type: Date, default: Date.now },
      lastLogin: Date
    },
    { versionKey: false }
  )
);

/* Small key/value store (persists the admin token secret) */
const Config = mongoose.model(
  "Config",
  new mongoose.Schema({ key: { type: String, unique: true, index: true }, value: String }, { versionKey: false })
);

async function connectMongoDB() {
  if (!MONGODB_URI) {
    mongoError = "MONGODB_URI is not configured";
    console.warn("[SILA API] MONGODB_URI is not configured. Running without a database.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    mongoConnected = true;
    mongoError = "";
    console.log("[SILA API] MongoDB connected.");
    await ensureModels();
  } catch (error) {
    mongoConnected = false;
    mongoError = error.message;
    console.error("[SILA API] MongoDB connection failed:", error.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (mongoose.connection.readyState !== 1) connectMongoDB();
  }, 15000);
  if (reconnectTimer.unref) reconnectTimer.unref();
}

async function ensureModels() {
  try {
    await Promise.all([RequestLog.init(), Visitor.init(), Admin.init(), Config.init()]);
  } catch (error) {
    console.error("[SILA API] Index setup:", error.message);
  }
}

mongoose.connection.on("disconnected", () => {
  mongoConnected = false;
  scheduleReconnect();
});
mongoose.connection.on("connected", () => {
  mongoConnected = true;
  mongoError = "";
});
mongoose.connection.on("error", (error) => {
  mongoError = error.message;
});

connectMongoDB();

/* =========================================================
   HELPERS
========================================================= */

function getIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
}

function createVisitorID(req) {
  const ip = getIP(req);
  const userAgent = req.headers["user-agent"] || "";
  return crypto.createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString("hex");
}

function pinProblem(pin) {
  const value = String(pin || "");
  if (value.length < 4) return "PIN must be at least 4 characters";
  if (value.length > 64) return "PIN must be at most 64 characters";
  return "";
}

function isAdminPath(p) {
  return p === ADMIN_PATH || p.startsWith(ADMIN_PATH + "/");
}

/* =========================================================
   ADMIN TOKEN  (secret persisted so sessions survive restarts)
========================================================= */

let cachedSecret = process.env.ADMIN_TOKEN_SECRET || process.env.SESSION_SECRET || "";
let secretPromise = null;

async function getTokenSecret() {
  if (cachedSecret) return cachedSecret;
  if (secretPromise) return secretPromise;

  secretPromise = (async () => {
    if (mongoConnected) {
      try {
        let doc = await Config.findOne({ key: "adminTokenSecret" });
        if (!doc) {
          doc = await Config.create({
            key: "adminTokenSecret",
            value: crypto.randomBytes(32).toString("hex")
          });
        }
        cachedSecret = doc.value;
        return cachedSecret;
      } catch (error) {
        console.error("[SILA API] Token secret:", error.message);
      }
    }

    /* No database: fall back to an in-memory secret so the panel still works */
    cachedSecret = crypto.randomBytes(32).toString("hex");
    console.warn("[SILA API] Admin sessions are in-memory (admin token secret not persisted).");
    return cachedSecret;
  })();

  return secretPromise;
}

function sign(secret, value) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

async function createAdminToken(username) {
  const secret = await getTokenSecret();
  const issued = Date.now();
  const signature = sign(secret, `${username}.${issued}`);
  return Buffer.from(`${username}.${issued}.${signature}`).toString("base64");
}

async function verifyAdminToken(token) {
  if (!token) return null;
  const secret = await getTokenSecret();

  try {
    const decoded = Buffer.from(String(token), "base64").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;

    const [username, rawIssued, signature] = parts;
    const issued = Number(rawIssued);
    if (!username || !issued || !signature) return null;
    if (Date.now() - issued > TOKEN_TTL) return null;
    if (!safeEqual(signature, sign(secret, `${username}.${issued}`))) return null;

    /* the account must still exist (env-bootstrap accounts included) */
    const admin = await findAdmin(username);
    if (!admin) return null;

    return { username };
  } catch {
    return null;
  }
}

async function findAdmin(username) {
  const name = String(username || "").trim();

  if (mongoConnected) {
    try {
      const doc = await Admin.findOne({ username: name }).lean();
      if (doc) return { username: doc.username, source: "database" };
      const any = await Admin.findOne().lean();
      if (any) return any.username === name ? { username: name, source: "database" } : null;
    } catch (error) {
      console.error("[SILA API] Admin lookup:", error.message);
    }
  }

  /* env bootstrap account */
  if (ENV_ADMIN_USERNAME && ENV_ADMIN_PIN && safeEqual(name, ENV_ADMIN_USERNAME)) {
    return { username: ENV_ADMIN_USERNAME, source: "env" };
  }

  return null;
}

async function adminExists() {
  if (mongoConnected) {
    try {
      const count = await Admin.countDocuments();
      if (count > 0) return true;
    } catch (error) {
      console.error("[SILA API] Admin count:", error.message);
    }
  }
  return Boolean(ENV_ADMIN_USERNAME && ENV_ADMIN_PIN);
}

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const admin = await verifyAdminToken(token);

  if (!admin) return res.status(401).json({ success: false, error: "Unauthorized" });
  req.admin = admin;
  next();
}

/* Brute-force protection: 8 attempts / 10 minutes / IP */
const loginAttempts = new Map();

function loginAllowed(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.reset) return true;
  return entry.count < 8;
}

function loginFailed(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.reset) loginAttempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
  else entry.count++;
}

function loginReset(ip) {
  loginAttempts.delete(ip);
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) if (now > entry.reset) loginAttempts.delete(ip);
}, 5 * 60 * 1000).unref();

/* =========================================================
   VISITOR TRACKING  (real time, MongoDB)
========================================================= */

async function trackVisitor(req) {
  if (!mongoConnected) return;

  try {
    const visitorId = createVisitorID(req);
    await Visitor.findOneAndUpdate(
      { visitorId },
      {
        $set: { ip: getIP(req), userAgent: req.headers["user-agent"] || "", lastSeen: new Date() },
        $inc: { views: 1 },
        $setOnInsert: { visitorId, firstSeen: new Date() }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("[SILA API] Visitor tracking:", error.message);
  }
}

app.use((req, res, next) => {
  const isPage =
    req.method === "GET" &&
    !req.path.startsWith("/api/") &&
    !isAdminPath(req.path) &&
    (req.path === "/" || req.path.endsWith(".html") || !path.extname(req.path)) &&
    !isEndpointPath(req.path);

  if (isPage) trackVisitor(req);
  next();
});

/* =========================================================
   REQUEST LOGGER  (endpoint calls only)
========================================================= */

app.use((req, res, next) => {
  const started = Date.now();

  res.on("finish", () => {
    if (!mongoConnected) return;
    if (req.path.startsWith("/api/admin/")) return;

    const isAPI = req.path.startsWith("/api/") || isEndpointPath(req.path);
    if (!isAPI) return;

    RequestLog.create({
      method: req.method,
      path: req.originalUrl.slice(0, 500),
      status: res.statusCode,
      success: res.statusCode < 400,
      responseTime: Date.now() - started,
      ip: getIP(req),
      userAgent: req.headers["user-agent"] || "",
      error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : ""
    }).catch(() => {});
  });

  next();
});

/* =========================================================
   DYNAMIC ENDPOINT LOADER  (auto-loads silatech/**.js)
========================================================= */

const endpointRegistry = new Map();
let dispatchList = [];

function isEndpointPath(p) {
  const clean = p.replace(/\/+$/, "") || "/";
  return dispatchList.some(
    (e) => clean === e.path || (e.type === "router" && clean.startsWith(e.path + "/"))
  );
}

function pathFromFile(filePath) {
  const rel = path.relative(API_DIR, filePath).replace(/\.js$/i, "");
  return "/" + rel.split(path.sep).join("/");
}

function prettyName(p) {
  const last = p.split("/").filter(Boolean).pop() || "endpoint";
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function routerMethods(router) {
  const found = new Set();
  for (const layer of router.stack || []) {
    if (layer.route) {
      for (const m of Object.keys(layer.route.methods || {})) {
        if (layer.route.methods[m]) found.add(m.toUpperCase());
      }
    }
  }
  return [...found];
}

function loadEndpoint(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    const mod = require(filePath);
    const folder = pathFromFile(filePath);

    let entry = null;

    if (typeof mod === "function" && typeof mod.handle === "function") {
      const info = mod.apiInfo || mod.info || {};
      const methods = routerMethods(mod);
      const method = String(info.method || methods[0] || "GET").toUpperCase();

      entry = {
        type: "router",
        path: info.path || folder,
        methods: methods.length ? methods : [method],
        router: mod,
        method,
        info
      };
    } else if (mod && typeof mod.handler === "function") {
      const method = String(mod.method || "get").toUpperCase();
      entry = {
        type: "handler",
        path: mod.path || folder,
        methods: [method],
        handler: mod.handler,
        method,
        info: mod
      };
    }

    if (!entry) {
      console.warn(`[SILA API] Skipped (not an endpoint): ${path.relative(ROOT_DIR, filePath)}`);
      return;
    }

    if (!entry.path.startsWith("/")) entry.path = "/" + entry.path;
    entry.path = entry.path.replace(/\/+$/, "") || "/";

    entry.name = entry.info.name || prettyName(entry.path);
    entry.description = entry.info.description || "SILA API endpoint.";
    entry.category = entry.path.split("/").filter(Boolean)[0] || "general";
    entry.parameters = Array.isArray(entry.info.parameters) ? entry.info.parameters : [];
    entry.source = path.relative(ROOT_DIR, filePath).split(path.sep).join("/");

    endpointRegistry.set(filePath, entry);
    console.log(`[SILA API] Loaded ${entry.method} ${entry.path}`);
  } catch (error) {
    console.error(`[SILA API] Failed loading ${filePath}:`, error.message);
  }
}

function walk(directory, out = []) {
  if (!fs.existsSync(directory)) return out;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

let lastSignature = "";

function endpointSignature(files) {
  return files
    .map((f) => {
      try {
        return `${f}:${fs.statSync(f).mtimeMs}`;
      } catch {
        return f;
      }
    })
    .join("|");
}

function scanEndpoints(force = false) {
  if (!fs.existsSync(API_DIR)) {
    console.warn(`[SILA API] API directory not found: ${API_DIR}`);
    return;
  }

  const files = walk(API_DIR).sort();
  const signature = endpointSignature(files);

  if (!force && signature === lastSignature) return;
  lastSignature = signature;

  endpointRegistry.clear();
  files.forEach(loadEndpoint);

  dispatchList = [...endpointRegistry.values()].sort((a, b) => b.path.length - a.path.length);

  console.log(`[SILA API] Endpoints active: ${dispatchList.length}`);
}

scanEndpoints(true);

/* Hot reload: new / changed / deleted endpoint files, no restart needed */
setInterval(() => {
  try {
    scanEndpoints(false);
  } catch (error) {
    console.error("[SILA API] Rescan failed:", error.message);
  }
}, 3000).unref();

function publicEndpointList() {
  return dispatchList
    .map((e) => ({
      name: e.name,
      description: e.description,
      method: e.method,
      path: e.path,
      category: e.category,
      parameters: e.parameters
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function categoryCount() {
  const set = new Set(dispatchList.map((e) => e.category));
  return set.size;
}

/* =========================================================
   BASIC API
========================================================= */

app.get("/api", (req, res) => {
  res.json({
    success: true,
    name: "SILA API",
    developer: "Sila Tech",
    baseUrl: BASE_URL,
    status: "online",
    endpoints: dispatchList.length
  });
});

app.get("/api/endpoints", (req, res) => {
  const endpoints = publicEndpointList();
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, total: endpoints.length, baseUrl: BASE_URL, endpoints });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    uptime: Math.round(process.uptime()),
    database: mongoConnected ? "connected" : "disconnected",
    endpoints: dispatchList.length
  });
});

/* ---------------------------------------------------------
   PUBLIC LIVE STATISTICS  (used by the homepage — real time)
   No endpoint names are exposed here on purpose: visitors see
   the numbers, and the full list lives on /endpoints.
--------------------------------------------------------- */
let statsCache = { at: 0, data: null };

async function buildPublicStats() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const chartStart = new Date();
  chartStart.setUTCHours(0, 0, 0, 0);
  chartStart.setUTCDate(chartStart.getUTCDate() - 6);

  const base = {
    status: {
      database: mongoConnected ? "connected" : "disconnected",
      uptime: Math.round(process.uptime()),
      endpointCount: dispatchList.length
    },
    requests: { total: 0, today: 0, week: 0, failedToday: 0, successRate: null, lastAt: null },
    visitors: { total: 0, today: 0, week: 0, online: 0 },
    categories: categoryCount(),
    activity: [],
    generatedAt: new Date().toISOString()
  };

  if (!mongoConnected) return base;

  const [
    requestsTotal,
    requestsToday,
    requestsWeek,
    failedToday,
    visitorsTotal,
    visitorsToday,
    visitorsWeek,
    onlineNow,
    chartRaw,
    lastRequest
  ] = await Promise.all([
    RequestLog.countDocuments(),
    RequestLog.countDocuments({ createdAt: { $gte: today } }),
    RequestLog.countDocuments({ createdAt: { $gte: week } }),
    RequestLog.countDocuments({ createdAt: { $gte: today }, success: false }),
    Visitor.countDocuments(),
    Visitor.countDocuments({ firstSeen: { $gte: today } }),
    Visitor.countDocuments({ firstSeen: { $gte: week } }),
    Visitor.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) } }),
    RequestLog.aggregate([
      { $match: { createdAt: { $gte: chartStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, requests: { $sum: 1 } } }
    ]),
    RequestLog.findOne().sort({ createdAt: -1 }).select("createdAt").lean()
  ]);

  const byDay = new Map(chartRaw.map((row) => [row._id, row.requests]));
  for (let i = 6; i >= 0; i--) {
    const day = new Date(chartStart);
    day.setUTCDate(chartStart.getUTCDate() + (6 - i));
    const key = day.toISOString().slice(0, 10);
    base.activity.push({
      date: key,
      label: day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      requests: byDay.get(key) || 0
    });
  }

  base.requests = {
    total: requestsTotal,
    today: requestsToday,
    week: requestsWeek,
    failedToday,
    successRate: requestsToday ? Math.round(((requestsToday - failedToday) / requestsToday) * 100) : null,
    lastAt: lastRequest ? lastRequest.createdAt : null
  };

  base.visitors = { total: visitorsTotal, today: visitorsToday, week: visitorsWeek, online: onlineNow };

  return base;
}

app.get("/api/public/stats", async (req, res) => {
  try {
    if (statsCache.data && Date.now() - statsCache.at < 5000) {
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, ...statsCache.data });
    }
    const data = await buildPublicStats();
    statsCache = { at: Date.now(), data };
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("[SILA API] Public stats:", error.message);
    res.status(500).json({ success: false, error: "Unable to load statistics" });
  }
});

/* =========================================================
   ADMIN AUTH  (MongoDB backed)
========================================================= */

app.get("/api/admin/status", async (req, res) => {
  res.json({
    success: true,
    configured: await adminExists(),
    database: mongoConnected ? "connected" : "disconnected"
  });
});

/* First-run: create the admin account (only when none exists) */
app.post("/api/admin/setup", async (req, res) => {
  const ip = getIP(req);

  if (!loginAllowed(ip)) {
    return res.status(429).json({ success: false, error: "Too many attempts. Try again later." });
  }

  const username = String((req.body && req.body.username) || "").trim();
  const pin = String((req.body && req.body.pin) || "");
  const confirm = String((req.body && req.body.confirmPin) || pin);

  if (username.length < 3) return res.status(400).json({ success: false, error: "Username must be at least 3 characters" });
  if (pin !== confirm) return res.status(400).json({ success: false, error: "The two PIN values do not match" });

  const problem = pinProblem(pin);
  if (problem) return res.status(400).json({ success: false, error: problem });

  if (!mongoConnected) {
    return res.status(503).json({
      success: false,
      error: "Database is not connected. Set MONGODB_URI in .env, then try again."
    });
  }

  try {
    if (await adminExists()) {
      return res.status(409).json({ success: false, error: "An admin account already exists. Please sign in." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    await Admin.create({ username, salt, pinHash: hashPin(pin, salt) });
    loginReset(ip);

    res.json({
      success: true,
      token: await createAdminToken(username),
      admin: { username }
    });
  } catch (error) {
    console.error("[SILA API] Admin setup:", error.message);
    res.status(500).json({ success: false, error: "Could not create the admin account" });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const ip = getIP(req);

  if (!loginAllowed(ip)) {
    return res.status(429).json({ success: false, error: "Too many attempts. Try again later." });
  }

  const username = String((req.body && req.body.username) || "").trim();
  const pin = String((req.body && req.body.pin) || "").trim();

  if (!username || !pin) {
    return res.status(400).json({ success: false, error: "Enter your username and PIN" });
  }

  /* Nothing configured yet -> let the panel open the setup form */
  if (!(await adminExists())) {
    return res.status(409).json({
      success: false,
      needsSetup: true,
      error: "No admin account yet. Create one to continue."
    });
  }

  let ok = false;
  let source = "database";

  try {
    if (mongoConnected) {
      const admin = await Admin.findOne({ username });
      if (admin) {
        ok = safeEqual(hashPin(pin, admin.salt), admin.pinHash);
        if (ok) {
          admin.lastLogin = new Date();
          await admin.save();
        }
      }
    }

    /* env bootstrap credentials still work */
    if (!ok && ENV_ADMIN_USERNAME && ENV_ADMIN_PIN) {
      ok = safeEqual(username, ENV_ADMIN_USERNAME) && safeEqual(pin, ENV_ADMIN_PIN);
      if (ok) source = "env";
      /* keep MongoDB in sync so the account survives .env changes */
      if (ok && mongoConnected) {
        const existing = await Admin.findOne({ username });
        if (!existing) {
          const salt = crypto.randomBytes(16).toString("hex");
          await Admin.create({ username, salt, pinHash: hashPin(pin, salt), lastLogin: new Date() });
        }
      }
    }
  } catch (error) {
    console.error("[SILA API] Admin login:", error.message);
    return res.status(500).json({ success: false, error: "Login is unavailable right now" });
  }

  if (!ok) {
    loginFailed(ip);
    return res.status(401).json({ success: false, error: "Invalid username or PIN" });
  }

  loginReset(ip);
  res.json({ success: true, token: await createAdminToken(username), admin: { username, source } });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ success: true, admin: { username: req.admin.username, source: req.admin.source } });
});

app.post("/api/admin/change-pin", requireAdmin, async (req, res) => {
  if (!mongoConnected) {
    return res.status(503).json({ success: false, error: "Database is not connected" });
  }

  const currentPin = String((req.body && req.body.currentPin) || "");
  const newPin = String((req.body && req.body.newPin) || "");

  const problem = pinProblem(newPin);
  if (problem) return res.status(400).json({ success: false, error: problem });

  try {
    const admin = await Admin.findOne({ username: req.admin.username });
    if (!admin) return res.status(404).json({ success: false, error: "Admin account not found" });
    if (!safeEqual(hashPin(currentPin, admin.salt), admin.pinHash)) {
      return res.status(401).json({ success: false, error: "Current PIN is not correct" });
    }

    admin.salt = crypto.randomBytes(16).toString("hex");
    admin.pinHash = hashPin(newPin, admin.salt);
    await admin.save();

    res.json({ success: true, message: "PIN updated" });
  } catch (error) {
    console.error("[SILA API] Change PIN:", error.message);
    res.status(500).json({ success: false, error: "Could not update the PIN" });
  }
});

/* =========================================================
   ADMIN API  (live data straight from MongoDB)
========================================================= */

app.get("/api/admin/endpoints", requireAdmin, (req, res) => {
  res.json({
    success: true,
    total: dispatchList.length,
    endpoints: dispatchList.map((e) => ({
      method: e.method,
      path: e.path,
      name: e.name,
      category: e.category,
      source: e.source
    }))
  });
});

app.get("/api/admin/requests", requireAdmin, async (req, res) => {
  try {
    if (!mongoConnected) return res.json({ success: true, requests: [] });
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const requests = await RequestLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, requests });
  } catch {
    res.status(500).json({ success: false, error: "Unable to load requests" });
  }
});

app.get("/api/admin/visitors", requireAdmin, async (req, res) => {
  try {
    if (!mongoConnected) return res.json({ success: true, visitors: [] });
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const visitors = await Visitor.find().sort({ lastSeen: -1 }).limit(limit).lean();
    res.json({ success: true, visitors });
  } catch {
    res.status(500).json({ success: false, error: "Unable to load visitors" });
  }
});

app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.json({
        success: true,
        database: "disconnected",
        endpointCount: dispatchList.length,
        stats: { requestsToday: 0, requestsTotal: 0, failedRequests: 0, activeVisitors: 0, successRate: null },
        visitors: { total: 0, today: 0, week: 0, month: 0 },
        chart: [],
        endpoints: [],
        recentRequests: [],
        failedRequestsList: []
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(now);
    month.setMonth(month.getMonth() - 1);

    const chartStart = new Date();
    chartStart.setUTCHours(0, 0, 0, 0);
    chartStart.setUTCDate(chartStart.getUTCDate() - 6);

    const [
      requestsTotal,
      requestsToday,
      failedRequests,
      activeVisitors,
      totalVisitors,
      visitorsToday,
      visitorsWeek,
      visitorsMonth,
      chartRaw,
      endpointStats,
      recentRequests,
      failedRequestsList
    ] = await Promise.all([
      RequestLog.countDocuments(),
      RequestLog.countDocuments({ createdAt: { $gte: today } }),
      RequestLog.countDocuments({ createdAt: { $gte: today }, success: false }),
      Visitor.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) } }),
      Visitor.countDocuments(),
      Visitor.countDocuments({ firstSeen: { $gte: today } }),
      Visitor.countDocuments({ firstSeen: { $gte: week } }),
      Visitor.countDocuments({ firstSeen: { $gte: month } }),
      RequestLog.aggregate([
        { $match: { createdAt: { $gte: chartStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, requests: { $sum: 1 } } }
      ]),
      RequestLog.aggregate([
        { $match: { createdAt: { $gte: month } } },
        {
          $group: {
            _id: { path: { $arrayElemAt: [{ $split: ["$path", "?"] }, 0] }, method: "$method" },
            requests: { $sum: 1 },
            success: { $sum: { $cond: ["$success", 1, 0] } },
            failed: { $sum: { $cond: ["$success", 0, 1] } }
          }
        },
        { $sort: { requests: -1 } },
        { $limit: 100 }
      ]),
      RequestLog.find().sort({ createdAt: -1 }).limit(30).lean(),
      RequestLog.find({ success: false }).sort({ createdAt: -1 }).limit(30).lean()
    ]);

    const byDay = new Map(chartRaw.map((row) => [row._id, row.requests]));
    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(chartStart);
      day.setUTCDate(chartStart.getUTCDate() + (6 - i));
      const key = day.toISOString().slice(0, 10);
      chart.push({
        label: day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        date: key,
        requests: byDay.get(key) || 0
      });
    }

    res.json({
      success: true,
      database: "connected",
      endpointCount: dispatchList.length,
      stats: {
        requestsTotal,
        requestsToday,
        failedRequests,
        activeVisitors,
        successRate: requestsToday ? Math.round(((requestsToday - failedRequests) / requestsToday) * 100) : null
      },
      visitors: { total: totalVisitors, today: visitorsToday, week: visitorsWeek, month: visitorsMonth },
      chart,
      endpoints: endpointStats.map((row) => ({
        path: row._id.path,
        method: row._id.method,
        requests: row.requests,
        success: row.success,
        failed: row.failed
      })),
      recentRequests,
      failedRequestsList
    });
  } catch (error) {
    console.error("[SILA API] Dashboard:", error);
    res.status(500).json({ success: false, error: "Dashboard error" });
  }
});

/* =========================================================
   ENDPOINT DISPATCHER  (serves everything in silatech/)
========================================================= */

app.use((req, res, next) => {
  if (!dispatchList.length) return next();

  const requested = req.path.replace(/\/+$/, "") || "/";

  for (const entry of dispatchList) {
    if (entry.type === "router") {
      const exact = requested === entry.path;
      const nested = requested.startsWith(entry.path + "/");
      if (!exact && !nested) continue;

      const originalUrl = req.url;
      const queryIndex = originalUrl.indexOf("?");
      const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : "";
      const rest = exact ? "/" : requested.slice(entry.path.length);

      req.url = rest + query;

      return entry.router(req, res, (err) => {
        req.url = originalUrl;
        next(err);
      });
    }

    if (requested === entry.path) {
      const method = req.method === "HEAD" ? "GET" : req.method;
      if (method !== entry.method) continue;

      return Promise.resolve()
        .then(() => entry.handler(req, res))
        .catch((error) => {
          console.error(`[SILA API] ${entry.path}:`, error.message);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message || "Endpoint error" });
          }
        });
    }
  }

  next();
});

/* =========================================================
   WEBSITE  (auto-loads every .html page)
========================================================= */

app.get("/silaapi.svg", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(LOGO_FILE);
});

const staticOptions = { extensions: ["html"], index: ["index.html"], maxAge: 0, dotfiles: "ignore" };

/* Admin site (hidden): /sila (sign in) and /sila/dashboard */
app.use(ADMIN_PATH, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});
app.use(ADMIN_PATH, express.static(ADMIN_DIR, staticOptions));

/* Public site: /, /about, /endpoints, /<any>.html */
app.use("/", express.static(PUBLIC_DIR, staticOptions));

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  const wantsHTML = req.method === "GET" && (req.headers.accept || "").includes("text/html");
  const notFoundPage = path.join(PUBLIC_DIR, "404.html");

  if (wantsHTML && fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);

  res.status(404).json({ success: false, error: "Endpoint not found", path: req.originalUrl });
});

/* =========================================================
   GLOBAL ERROR
========================================================= */

app.use((error, req, res, next) => {
  console.error("[SILA API]", error);
  if (res.headersSent) return next(error);
  res.status(500).json({ success: false, error: "Internal server error" });
});

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("             SILA API");
  console.log("======================================");
  console.log(`Port: ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoints loaded: ${dispatchList.length}`);
  console.log(`Database: ${MONGODB_URI ? "connecting…" : "not configured"}`);
  console.log("======================================");
  console.log("");
});
