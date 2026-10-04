/* =========================================================
   SILA API  —  by Sila Tech
   ---------------------------------------------------------
   AUTO-LOADING SERVER

   • Drop a .js file anywhere inside  /silatech  and it becomes an
     endpoint automatically:
         silatech/ai/talkai.js        ->  GET /ai/talkai
         silatech/image/firelogo.js   ->  GET /image/firelogo
         silatech/tools/weather.js    ->  GET /tools/weather
   • Drop an .html file inside  /sila  (public site) or  /silapanel
     (admin) and it becomes a page automatically:
         sila/pricing.html            ->  /pricing
         silapanel/users.html         ->  /silapanel/users
   • New / edited / deleted files are picked up WITHOUT a restart.

   Supported endpoint formats
   --------------------------
   1) Express router (your current style)
        const router = require("express").Router();
        router.apiInfo = { name, description, method, parameters: [...] };
        router.get("/", (req, res) => { ... });
        module.exports = router;

   2) Plain object
        module.exports = {
          path: "/ai/example",        // optional, defaults to folder/file
          method: "get",              // get | post | put | delete ...
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

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PIN = process.env.ADMIN_PIN || "";

let ADMIN_TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET || process.env.SESSION_SECRET || "";

if (!ADMIN_TOKEN_SECRET) {
  ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("[SILA API] No ADMIN_TOKEN_SECRET / SESSION_SECRET set. Using a random one (admin sessions reset on restart).");
}

if (!ADMIN_USERNAME || !ADMIN_PIN) {
  console.warn("[SILA API] ADMIN_USERNAME / ADMIN_PIN are not set. Admin login is DISABLED until you set them.");
}

const ROOT_DIR = __dirname;
const API_DIR = path.join(ROOT_DIR, "silatech"); // endpoints
const PUBLIC_DIR = path.join(ROOT_DIR, "sila"); // public website
const ADMIN_DIR = path.join(ROOT_DIR, "silapanel"); // admin website
const LOGO_FILE = path.join(ROOT_DIR, "silaapi.svg");

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
      country: String,
      city: String,
      error: String
    },
    { timestamps: true, versionKey: false }
  )
);

const Visitor = mongoose.model(
  "Visitor",
  new mongoose.Schema(
    {
      visitorId: { type: String, unique: true, index: true },
      ip: String,
      userAgent: String,
      country: String,
      city: String,
      firstSeen: { type: Date, default: Date.now },
      lastSeen: { type: Date, default: Date.now }
    },
    { versionKey: false }
  )
);

async function connectMongoDB() {
  if (!MONGODB_URI) {
    console.warn("[SILA API] MONGODB_URI is not configured. Running without a database.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    mongoConnected = true;
    console.log("[SILA API] MongoDB connected.");
  } catch (error) {
    mongoConnected = false;
    console.error("[SILA API] MongoDB connection failed:", error.message);
  }
}

mongoose.connection.on("disconnected", () => (mongoConnected = false));
mongoose.connection.on("connected", () => (mongoConnected = true));

connectMongoDB();

/* =========================================================
   HELPERS
========================================================= */

function getIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
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

/* =========================================================
   ADMIN TOKEN
========================================================= */

function sign(value) {
  return crypto.createHmac("sha256", ADMIN_TOKEN_SECRET).update(value).digest("hex");
}

function createAdminToken(username) {
  const timestamp = Date.now();
  const signature = sign(`${username}.${timestamp}`);
  return Buffer.from(`${username}.${timestamp}.${signature}`).toString("base64");
}

function verifyAdminToken(token) {
  if (!token || !ADMIN_USERNAME) return false;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;

    const [username, rawTimestamp, signature] = parts;
    const timestamp = Number(rawTimestamp);

    if (username !== ADMIN_USERNAME || !timestamp || !signature) return false;
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false;

    return safeEqual(signature, sign(`${username}.${timestamp}`));
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!verifyAdminToken(token)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

/* Simple brute-force protection: 8 attempts / 10 minutes / IP */
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
  if (!entry || now > entry.reset) {
    loginAttempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
  } else {
    entry.count++;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) if (now > entry.reset) loginAttempts.delete(ip);
}, 5 * 60 * 1000).unref();

/* =========================================================
   VISITOR TRACKING  (public website pages only)
========================================================= */

async function trackVisitor(req) {
  if (!mongoConnected) return;

  try {
    const visitorId = createVisitorID(req);
    await Visitor.findOneAndUpdate(
      { visitorId },
      {
        $set: {
          ip: getIP(req),
          userAgent: req.headers["user-agent"] || "",
          lastSeen: new Date()
        },
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
    !req.path.startsWith("/silapanel") &&
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
   DYNAMIC ENDPOINT LOADER  (auto-loads /silatech/**.js)
========================================================= */

/** file path -> endpoint entry */
const endpointRegistry = new Map();
/** sorted list used by the dispatcher (longest path first) */
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
      /* ---- Express router ---- */
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
      /* ---- Plain object ---- */
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

/* ---------- public endpoint list (used by the website) ---------- */

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

/* =========================================================
   ADMIN API
========================================================= */

app.post("/api/admin/login", (req, res) => {
  const ip = getIP(req);

  if (!ADMIN_USERNAME || !ADMIN_PIN) {
    return res.status(503).json({ success: false, error: "Admin login is not configured" });
  }

  if (!loginAllowed(ip)) {
    return res.status(429).json({ success: false, error: "Too many attempts. Try again later." });
  }

  const username = String(req.body?.username || "").trim();
  const pin = String(req.body?.pin || "").trim();

  const okUser = safeEqual(username, ADMIN_USERNAME);
  const okPin = safeEqual(pin, ADMIN_PIN);

  if (!(okUser && okPin)) {
    loginFailed(ip);
    return res.status(401).json({ success: false, error: "Invalid username or PIN" });
  }

  res.json({
    success: true,
    token: createAdminToken(username),
    admin: { username }
  });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ success: true, admin: { username: ADMIN_USERNAME } });
});

app.get("/api/admin/endpoints", requireAdmin, (req, res) => {
  res.json({
    success: true,
    total: dispatchList.length,
    endpoints: dispatchList.map((e) => ({
      method: e.method,
      path: e.path,
      name: e.name,
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
        endpoints: dispatchList.length,
        stats: { totalRequestsToday: 0, requestsToday: 0, failedRequests: 0, activeVisitors: 0 },
        visitors: { total: 0, today: 0, week: 0, month: 0 }
      });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const week = new Date(now);
    week.setDate(week.getDate() - 7);

    const month = new Date(now);
    month.setMonth(month.getMonth() - 1);

    const [requestsToday, failedRequests, activeVisitors, totalVisitors, visitorsToday, visitorsWeek, visitorsMonth] =
      await Promise.all([
        RequestLog.countDocuments({ createdAt: { $gte: today } }),
        RequestLog.countDocuments({ createdAt: { $gte: today }, success: false }),
        Visitor.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 30 * 60 * 1000) } }),
        Visitor.countDocuments(),
        Visitor.countDocuments({ firstSeen: { $gte: today } }),
        Visitor.countDocuments({ firstSeen: { $gte: week } }),
        Visitor.countDocuments({ firstSeen: { $gte: month } })
      ]);

    res.json({
      success: true,
      database: "connected",
      endpoints: dispatchList.length,
      stats: {
        totalRequestsToday: requestsToday,
        requestsToday,
        failedRequests,
        activeVisitors
      },
      visitors: {
        total: totalVisitors,
        today: visitorsToday,
        week: visitorsWeek,
        month: visitorsMonth
      }
    });
  } catch (error) {
    console.error("[SILA API] Dashboard:", error);
    res.status(500).json({ success: false, error: "Dashboard error" });
  }
});

/* =========================================================
   ENDPOINT DISPATCHER  (serves everything in /silatech)
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

/* Logo lives in the project root */
app.get("/silaapi.svg", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(LOGO_FILE);
});

/* Old admin URLs -> new ones */
app.get(["/sila/admin", "/sila/admin/"], (req, res) => res.redirect(302, "/silapanel"));
app.get(
  ["/sila/dashboard", "/sila/dashboard.html", "/sila/admin/dashboard", "/silapanel/dashboard.html"],
  (req, res) => res.redirect(302, "/silapanel/dashboard")
);

const staticOptions = {
  extensions: ["html"], // /about  ->  about.html
  index: ["index.html"],
  maxAge: 0,
  dotfiles: "ignore"
};

/* Admin site:   /silapanel, /silapanel/dashboard, /silapanel/<any>.html */
app.use("/silapanel", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/silapanel", express.static(ADMIN_DIR, staticOptions));

/* Public site:  /, /about, /endpoints, /<any>.html  (and legacy /sila/*) */
app.use("/sila", express.static(PUBLIC_DIR, staticOptions));
app.use("/", express.static(PUBLIC_DIR, staticOptions));

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  const wantsHTML = req.method === "GET" && (req.headers.accept || "").includes("text/html");
  const notFoundPage = path.join(PUBLIC_DIR, "404.html");

  if (wantsHTML && fs.existsSync(notFoundPage)) {
    return res.status(404).sendFile(notFoundPage);
  }

  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl
  });
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
  console.log("======================================");
  console.log("");
});
