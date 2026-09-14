import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/** Validates req.body against a Zod schema; replaces it with the parsed (and stripped) result. */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Dữ liệu không hợp lệ.',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
