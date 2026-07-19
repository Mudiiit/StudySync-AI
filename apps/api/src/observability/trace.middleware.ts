import { NestMiddleware, Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
    const requestId = randomUUID();

    const anyReq = req as any;
    anyReq.traceId = traceId;
    anyReq.requestId = requestId;

    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-request-id', requestId);

    console.log(
      `[HTTP Request] Method: ${req.method} Path: ${req.originalUrl || req.url}`,
      `Has Auth Header:`,
      !!req.headers.authorization,
      `Auth Value:`,
      req.headers.authorization
        ? req.headers.authorization.substring(0, 25)
        : 'None',
    );

    res.on('finish', () => {
      console.log(
        `[HTTP Response] Method: ${req.method} Path: ${req.originalUrl || req.url} Status: ${res.statusCode}`,
      );
    });

    next();
  }
}
