import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import session from 'express-session';
import 'dotenv/config';

const port = process.env.PORT || 4001;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe());
  app.use(helmet());
  app.use(
    session({
      secret: 'my-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7000,
      },
    }),
  );
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();
