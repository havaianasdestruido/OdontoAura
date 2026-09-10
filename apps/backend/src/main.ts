import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compress from '@fastify/compress';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(compress, { threshold: 1024 });

  app.setGlobalPrefix('api');
  // TODO: restrict CORS origins via env config instead of allowing all origins
  app.enableCors();
  // TODO: add forbidNonWhitelisted: true to ValidationPipe to reject unknown properties with 400
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // TODO: register global ExceptionFilter so UnauthorizedException/ForbiddenException return proper status codes instead of 500

  const config = new DocumentBuilder()
    .setTitle('OdontoAura API')
    .setDescription('Dental clinic management system API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // TODO: gate Swagger behind auth or env check — hide /api/docs in production
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`OdontoAura API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
