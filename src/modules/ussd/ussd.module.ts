import {
  UssdSessionLog,
  UssdSessionLogSchema,
} from './../schemas/ussdSessionLog.schema';
import {
  UssdSession,
  UssdSessionSchema,
} from './../schemas/ussdSession.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { ussdController } from './ussd.controller';
import { ussdService } from './ussd.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UssdSession.name, schema: UssdSessionSchema },
      { name: UssdSessionLog.name, schema: UssdSessionLogSchema },
    ]),
  ],
  providers: [ussdService],
  controllers: [ussdController],
})
export class ussdModule {}
