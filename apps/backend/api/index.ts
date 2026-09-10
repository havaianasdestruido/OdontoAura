import { createApp } from '../src/main';

export default async function handler(req: any, res: any) {
  const app = await createApp();
  return app.getHttpAdapter().getInstance()(req, res);
}
