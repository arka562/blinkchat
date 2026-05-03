// ✅ LOAD ENV FIRST (CRITICAL)
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path, { dirname } from "path";
import cors from "cors";
import { createServer } from "http";
import { fileURLToPath } from "url";

import { initSocket } from "./config/socket.js"; // ✅ ONLY this
import aj from "./config/arcjet.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import connectDB from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Debug
console.log("ENV CHECK:", process.env.MONGO_URI);

// ✅ EXPRESS CORS (VERY IMPORTANT)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Security & logging
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));

// ✅ Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ✅ Arcjet protection middleware
app.use(async (req, res, next) => {
  try {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      return res.status(403).json({
        success: false,
        message: "Request blocked by security rules",
      });
    }

    next();
  } catch (error) {
    console.error("Arcjet error:", error);
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} → ${duration}ms`);
  });

  next();
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(
      path.join(__dirname, "../frontend", "dist", "index.html")
    );
  });
}

// ✅ Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    // 🔥 SINGLE socket initialization (ONLY THIS)
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});