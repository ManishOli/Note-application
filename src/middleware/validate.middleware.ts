import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { failure } from "../utils/response.js";

export function validate(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      failure(res, 400, "Input validation failed.", result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })));
      return;
    }

    req.validatedBody = result.data;
    next();
  };
}
