import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import noteRoutes from "./routes/note.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { checkCsrfToken, createCsrfToken } from "./middleware/csrf.middleware.js";
import { env, trustedOrigins } from "./config/env.js";
import { success } from "./utils/response.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Non-browser tools may omit Origin. CORS is not authentication.
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests. Try again later." },
});

app.get("/api/health", (_req, res) => success(res, 200, "API is running"));
app.get("/api/csrf", createCsrfToken, (req, res) => {
  success(res, 200, "CSRF token issued.", { csrfToken: req.csrfToken });
});

app.use("/api/auth", authLimiter, checkCsrfToken, authRoutes);
app.use("/api/notes", checkCsrfToken, noteRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
