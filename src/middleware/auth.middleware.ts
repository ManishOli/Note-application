import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { failure } from "../utils/response.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const token: unknown = req.cookies?.token;
  if (typeof token !== "string" || token.length === 0) {
    failure(res, 401, "Please sign in first.");
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "junior-backend",
      audience: "junior-backend-api",
    });

    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.email !== "string") {
      failure(res, 401, "Session is invalid. Please sign in again.");
      return;
    }

    req.user = { sub: payload.sub, email: payload.email };
    next();
  } catch {
    failure(res, 401, "Session is invalid or expired. Please sign in again.");
  }
};
