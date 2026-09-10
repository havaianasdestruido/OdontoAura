import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { AppModule } from './app.module';

let appPromise: Promise<NestExpressApplication> | undefined;

export function createApp() {
  if (appPromise) return appPromise;

  appPromise = NestFactory.create<NestExpressApplication>(AppModule).then(async (app) => {
    app.use(compression({ threshold: 1024 }));

  app.setGlobalPrefix('api');
  const defaultOrigins = [
    'http://localhost:3000',
    'https://odonto-aura-frontend.vercel.app',
  ];
  const envOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(
    new Set([...(envOrigins || []), ...defaultOrigins]),
  );
  app.enableCors({ origin: allowedOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // TODO: register global ExceptionFilter so UnauthorizedException/ForbiddenException return proper status codes instead of 500

  const config = new DocumentBuilder()
    .setTitle('OdontoAura API')
    .setDescription('Dental clinic management system API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.init();
  return app;
  });

  return appPromise;
}

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`OdontoAura API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
if (require.main === module) {
  void bootstrap();
}
