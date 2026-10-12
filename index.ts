import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const app = express();
const port = Number(process.env.PORT || 3001);
const dataDir = path.resolve("data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "lf10.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS invites (id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', function TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '', x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0, z REAL NOT NULL DEFAULT 0, rx REAL NOT NULL DEFAULT 0, ry REAL NOT NULL DEFAULT 0, rz REAL NOT NULL DEFAULT 0, sx REAL NOT NULL DEFAULT 1, sy REAL NOT NULL DEFAULT 1, sz REAL NOT NULL DEFAULT 1);
`);
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "lf10.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret-before-deploying",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const hashCode = (code: string) => crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((req.session as any).adminId) return next();
  return res.status(401).json({ error: "Admin-Anmeldung erforderlich." });
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/access/check", (req, res) => {
  const code = String(req.body?.code || "").trim();
  if (!code || code.length > 100) return res.status(400).json({ valid: false });
  const row = db.prepare("SELECT id FROM invites WHERE code_hash = ? AND active = 1").get(hashCode(code));
  if (row) (req.session as any).accessGranted = true;
  res.json({ valid: Boolean(row) });
});
app.post("/api/admin/setup", loginLimiter, async (req, res) => {
  const setupKey = process.env.ADMIN_SETUP_KEY;
  if (!setupKey || String(req.body?.setupKey || "") !== setupKey) return res.status(403).json({ error: "Setup-Schlüssel fehlt oder ist falsch." });
  const count = (db.prepare("SELECT COUNT(*) AS n FROM admins").get() as {n:number}).n;
  if (count > 0) return res.status(409).json({ error: "Admin-Konto wurde bereits eingerichtet." });
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (username.length < 3 || password.length < 12) return res.status(400).json({ error: "Benutzername mindestens 3 Zeichen, Passwort mindestens 12 Zeichen." });
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, passwordHash);
  res.status(201).json({ ok: true, message: "Admin-Konto eingerichtet. Setup-Schlüssel anschließend aus der Umgebung entfernen." });
});
app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const admin = db.prepare("SELECT id, password_hash FROM admins WHERE username = ?").get(username) as {id:number;password_hash:string}|undefined;
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) return res.status(401).json({ error: "Anmeldung fehlgeschlagen." });
  (req.session as any).adminId = admin.id;
  res.json({ ok: true });
});
app.post("/api/admin/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/admin/me", isAdmin, (_req, res) => res.json({ authenticated: true }));
app.get("/api/admin/invites", isAdmin, (_req, res) => {
  // Codes werden absichtlich nicht im Klartext gespeichert/ausgegeben. Bereits erstellte Codes müssen beim Erstellen kopiert werden.
  const rows = db.prepare("SELECT id, label, active, created_at FROM invites ORDER BY id DESC").all();
  res.json(rows);
});
app.post("/api/admin/invites", isAdmin, (req, res) => {
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  const label = String(req.body?.label || "").slice(0, 100);
  const result = db.prepare("INSERT INTO invites (code_hash, label) VALUES (?, ?)").run(hashCode(code), label);
  res.status(201).json({ id: result.lastInsertRowid, code, label, active: true });
});
app.patch("/api/admin/invites/:id", isAdmin, (req, res) => {
  const active = req.body?.active ? 1 : 0;
  const result = db.prepare("UPDATE invites SET active = ? WHERE id = ?").run(active, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Code nicht gefunden." });
  res.json({ ok: true });
});
app.delete("/api/admin/invites/:id", isAdmin, (req, res) => {
  db.prepare("DELETE FROM invites WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});
app.get("/api/admin/items", isAdmin, (_req, res) => res.json(db.prepare("SELECT * FROM items ORDER BY name").all()));
app.post("/api/admin/items", isAdmin, (req, res) => {
  const d = req.body || {};
  const id = String(d.id || crypto.randomUUID());
  db.prepare(`INSERT INTO items (id,name,description,function,location,image_url,category,x,y,z,rx,ry,rz,sx,sy,sz)
    VALUES (@id,@name,@description,@function,@location,@image_url,@category,@x,@y,@z,@rx,@ry,@rz,@sx,@sy,@sz)`).run({
    id, name: String(d.name || "Unbenannter Gegenstand"), description: String(d.description || ""), function: String(d.function || ""),
    location: String(d.location || ""), image_url: String(d.image_url || ""), category: String(d.category || ""),
    x: Number(d.x || 0), y: Number(d.y || 0), z: Number(d.z || 0), rx: Number(d.rx || 0), ry: Number(d.ry || 0), rz: Number(d.rz || 0),
    sx: Number(d.sx || 1), sy: Number(d.sy || 1), sz: Number(d.sz || 1)
  });
  res.status(201).json({ id });
});
app.delete("/api/admin/items/:id", isAdmin, (req, res) => {
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve("dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
app.listen(port, () => console.log(`LF10 API läuft auf http://localhost:${port}`));
