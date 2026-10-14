import type { CookieOptions } from "express";
import { env } from "./env.js";

// The JWT is inaccessible to browser JavaScript. Cookie attributes must match when clearing it.
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60 * 1000,
};

// This cookie is intentionally readable by the frontend for the double-submit CSRF pattern.
export const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60 * 1000,
};
