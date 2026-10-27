import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { createResponse } from "../utils/helpers";

export function validateBody(schema: ZodType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      const details =
        error instanceof ZodError
          ? error.issues
          : error instanceof Error
            ? error.message
            : String(error);
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "Validation failed",
            details,
            "VALIDATION_ERROR",
          ),
        );
    }
  };
}
