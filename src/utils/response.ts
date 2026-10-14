import type { Response } from "express";

export function success(res: Response, statusCode: number, message: string, data?: unknown) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data === undefined ? {} : { data }),
  });
}

export function failure(res: Response, statusCode: number, message: string, errors?: unknown) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors === undefined ? {} : { errors }),
  });
}
