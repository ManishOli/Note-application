import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { authCookieOptions } from "../config/cookies.js";
import { env } from "../config/env.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";
import { failure, success } from "../utils/response.js";

function makeToken(user: { id: string; email: string }): string {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "1h",
    algorithm: "HS256",
    issuer: "junior-backend",
    audience: "junior-backend-api",
  });
}

function publicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password } = req.validatedBody as RegisterInput;
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    res.cookie("token", makeToken(user), authCookieOptions);
    success(res, 201, "Account created.", { user: publicUser(user) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      failure(res, 409, "An account with this email already exists.");
      return;
    }
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody as LoginInput;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      failure(res, 401, "Invalid email or password.");
      return;
    }

    res.cookie("token", makeToken(user), authCookieOptions);
    success(res, 200, "Signed in.", { user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = (req, res) => {
  success(res, 200, "Current user.", {
    user: { id: req.user?.sub, email: req.user?.email },
  });
};

export const logout: RequestHandler = (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions;
  res.clearCookie("token", clearOptions);
  success(res, 200, "Signed out.");
};
