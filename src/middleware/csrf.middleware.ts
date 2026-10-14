import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { csrfCookieOptions } from "../config/cookies.js";
import { trustedOrigins } from "../config/env.js";
import { failure } from "../utils/response.js";

export const createCsrfToken: RequestHandler = (req, res, next) => {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrfToken", token, csrfCookieOptions);
  req.csrfToken = token;
  next();
};

export const checkCsrfToken: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("Origin");
  if (origin && !trustedOrigins.includes(origin)) {
    failure(res, 403, "Request origin is not trusted.");
    return;
  }

  const cookieToken: unknown = req.cookies?.csrfToken;
  const headerToken = req.get("X-CSRF-Token");

  if (typeof cookieToken !== "string" || !headerToken) {
    failure(res, 403, "CSRF check failed. Get a fresh token from GET /api/csrf.");
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    failure(res, 403, "CSRF check failed. Get a fresh token from GET /api/csrf.");
    return;
  }

  next();
};
