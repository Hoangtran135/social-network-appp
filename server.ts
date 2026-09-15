// Must run before any other import — several modules (e.g. server/middleware/auth.ts)
// read process.env at import time, and ESM/bundled imports all execute before the
// rest of this file's body, so a later dotenv.config() call would be too late.
import "dotenv/config";

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import path from "path";
import fs from "fs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { createServer as createViteServer } from "vite";
import { connectDB } from "./server/db";
import { ensureBotUser } from "./server/ai";
import { openApiSpec } from "./server/swagger";
import { requireAuth } from "./server/middleware/auth";
import { setupRealtime } from "./server/realtime";
import { authRouter } from "./server/routes/auth";
import { usersRouter } from "./server/routes/users";
import { postsRouter } from "./server/routes/posts";
import { commentsRouter } from "./server/routes/comments";
import { friendsRouter } from "./server/routes/friends";
import { notificationsRouter } from "./server/routes/notifications";
import { groupsRouter } from "./server/routes/groups";
import { messagesRouter } from "./server/routes/messages";
import { storiesRouter } from "./server/routes/stories";
import { reportsRouter } from "./server/routes/reports";

if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set in production — refusing to start against the local default.");
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

async function startServer() {
  await connectDB();
  await ensureBotUser();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Behind Nginx (or any reverse proxy) — trust the X-Forwarded-* headers it sets so
  // express-rate-limit identifies real client IPs instead of throwing/misbehaving.
  app.set('trust proxy', 1);

  // Middleware
  app.use(
    cors({
      origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(mongoSanitize());

  // Throttle auth endpoints — brute-force / credential-stuffing protection
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/refresh", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/friends", friendsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/stories", storiesRouter);
  app.use("/api/reports", reportsRouter);

  // API Routes
  app.get("/api", (req, res) => {
    res.json({
      message: "Social Network API đang chạy!",
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "Social Network API is running",
    });
  });

  // File uploads (post images, avatars, cover photos, group media...)
  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) cb(null, true);
      else cb(new Error("Loại file không được hỗ trợ."));
    },
  });

  // Serve uploads with no execution risk — inline images/videos only, everything else forced to download
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      setHeaders: (res, filePath) => {
        const isMedia = /\.(jpe?g|png|gif|webp|mp4|webm|mov)$/i.test(filePath);
        res.setHeader("Content-Disposition", isMedia ? "inline" : "attachment");
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );

  app.post("/api/upload", requireAuth, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || "Không có file hợp lệ." });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: "Không có file hợp lệ." });
        return;
      }
      res.json({
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        size: req.file.size,
      });
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: 3000 },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Centralized error handler — must be registered last. Catches sync throws and
  // errors passed via next(err); keeps stack traces out of client responses in production.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled request error:", err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: process.env.NODE_ENV === "production" ? "Đã có lỗi xảy ra, vui lòng thử lại sau." : String(err?.message || err),
    });
  });

  const httpServer = http.createServer(app);
  setupRealtime(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
