import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilita CORS para permitir que a porta 3000 acesse a 3001
  app.enableCors({
    origin: '*', // Permite tudo (ou use 'http://localhost:3000' para ser restrito)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Backend roda na 3001
  await app.listen(3001);
  console.log('🚀 Backend rodando em http://localhost:3001');
}
bootstrap();