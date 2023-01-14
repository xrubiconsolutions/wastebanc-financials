import {
  localGovernment,
  localGovernmentSchema,
} from './../schemas/localgovernment.schema';
import { Categories, CategoriesSchema } from './../schemas/category.schema';
import { User, UserSchema } from './../schemas/user.schema';
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
      { name: User.name, schema: UserSchema },
      { name: Categories.name, schema: CategoriesSchema },
      { name: localGovernment.name, schema: localGovernmentSchema },
    ]),
  ],
  providers: [ussdService],
  controllers: [ussdController],
})
export class ussdModule {}
