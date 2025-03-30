
import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

export function sanitizeRequestBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object') return obj;
      
      const clean: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          clean[key] = sanitizeHtml(value, {
            allowedTags: [],
            allowedAttributes: {}
          });
        } else if (Array.isArray(value)) {
          clean[key] = value.map(item => sanitize(item));
        } else if (typeof value === 'object') {
          clean[key] = sanitize(value);
        } else {
          clean[key] = value;
        }
      }
      return clean;
    };

    req.body = sanitize(req.body);
  }
  next();
}
