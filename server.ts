import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("cafe.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS loyalty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    points INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    time TEXT,
    guests INTEGER
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/loyalty/:userId", (req, res) => {
    const row = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(req.params.userId) as { points: number } | undefined;
    res.json({ points: row ? row.points : 0 });
  });

  app.post("/api/loyalty/update", (req, res) => {
    const { userId, pointsToAdd } = req.body;
    const existing = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(userId) as { points: number } | undefined;
    if (existing) {
      db.prepare("UPDATE loyalty SET points = points + ? WHERE user_id = ?").run(pointsToAdd, userId);
    } else {
      db.prepare("INSERT INTO loyalty (user_id, points) VALUES (?, ?)").run(userId, pointsToAdd);
    }
    const updated = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(userId) as { points: number };
    res.json({ points: updated.points });
  });

  app.post("/api/loyalty/redeem", (req, res) => {
    const { userId, pointsToRedeem } = req.body;
    const existing = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(userId) as { points: number } | undefined;
    if (existing && existing.points >= pointsToRedeem) {
      db.prepare("UPDATE loyalty SET points = points - ? WHERE user_id = ?").run(pointsToRedeem, userId);
      const updated = db.prepare("SELECT points FROM loyalty WHERE user_id = ?").get(userId) as { points: number };
      res.json({ success: true, points: updated.points });
    } else {
      res.status(400).json({ error: "Insufficient points" });
    }
  });

  app.post("/api/reservations", (req, res) => {
    const { name, time, guests } = req.body;
    db.prepare("INSERT INTO reservations (name, time, guests) VALUES (?, ?, ?)").run(name, time, guests);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
