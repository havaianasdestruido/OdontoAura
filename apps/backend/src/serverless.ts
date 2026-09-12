import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from './app.bootstrap';

let appPromise: Promise<NestFastifyApplication> | null = null;

async function getApp(): Promise<NestFastifyApplication> {
  if (!appPromise) {
    appPromise = createApp().then(async (app) => {
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    });
  }
  return appPromise;
}

interface ServerlessRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ServerlessResponse {
  writeHead: (statusCode: number, headers: Record<string, string | number | string[]>) => void;
  end: (body: string) => void;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  try {
    const app = await getApp();
    const fastify = app.getHttpAdapter().getInstance();

    const payload =
      req.method === 'GET' || req.method === 'DELETE'
        ? undefined
        : typeof req.body === 'string'
          ? req.body
          : req.body
            ? JSON.stringify(req.body)
            : undefined;

    const result = await fastify.inject({
      method: (req.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
      url: req.url || '/',
      headers: req.headers || {},
      payload,
    });

    res.writeHead(result.statusCode, result.headers);
    res.end(result.payload);
  } catch (err) {
    console.error('handler_error', err);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}