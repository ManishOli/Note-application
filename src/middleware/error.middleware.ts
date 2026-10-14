import type { ErrorRequestHandler, RequestHandler } from "express";
import { failure } from "../utils/response.js";

export const notFound: RequestHandler = (req, res) => {
  failure(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof Error && error.message === "Origin is not allowed by CORS.") {
    failure(res, 403, "This frontend origin is not trusted.");
    return;
  }

  // Avoid returning internal exception details to clients.
  console.error(error);
  failure(res, 500, "Something went wrong.");
};
