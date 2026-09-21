import express from "express";
import path from "path";
import webPush from "web-push";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Set up Web Push with fallbacks for development convenience
  const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || 'BOljDDMkBKltWPL_Ws2-sqA7Bz08sswozv_hB3PZPalrJcGjWZsF7pNnukRm2u8azszEZed1p5afYbIYqGgz_Yk';
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '2vdi6Ll0he-CkjIDHdg0_50Gyk1w27Aeg5KpmZyhnf0';
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@barbearia.com';

  webPush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );

  // API to get Public Key for frontend
  app.get("/api/push/public-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC });
  });

  // API Route to send Push Notifications
  app.post("/api/push/send", async (req, res) => {
    try {
      const { subscription, title, body } = req.body;
      if (!subscription) {
        return res.status(400).json({ error: "Missing subscription object" });
      }
      await webPush.sendNotification(subscription, JSON.stringify({ title, body }));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Push Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Health Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("Server error:", err);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
