// No arquivo main.ts do seu Backend NestJS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilite o CORS assim:
  app.enableCors({
    origin: 'http://localhost:3000', // URL do seu Frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.enableCors(); // Ou especifique a origem do seu frontend

  await app.listen(3001);
}
bootstrap();