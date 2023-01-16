import {
  CharityOrganisation,
  CharityOrganisationSchema,
} from './../schemas/charityorganisation.schema';
import { onesignalModule } from './../notification/onesignal/onesignal.module';
import { smsModule } from './../notification/sms/sms.module';
import {
  notification,
  notificationSchema,
} from './../schemas/notification.schema';
import {
  Organisation,
  OrganisationSchema,
} from './../schemas/organisation.schema';
import { schedules, schedulesSchema } from './../schemas/schedule.schema';
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
import { Module, Scope } from '@nestjs/common';
import moment from 'moment-timezone';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UssdSession.name, schema: UssdSessionSchema },
      { name: UssdSessionLog.name, schema: UssdSessionLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Categories.name, schema: CategoriesSchema },
      { name: localGovernment.name, schema: localGovernmentSchema },
      { name: schedules.name, schema: schedulesSchema },
      { name: Organisation.name, schema: OrganisationSchema },
      { name: notification.name, schema: notificationSchema },
      { name: CharityOrganisation.name, schema: CharityOrganisationSchema },
    ]),
    smsModule,
    onesignalModule,
  ],
  providers: [
    ussdService,
    {
      provide: 'moment',
      useFactory: async () => moment(new Date()),
      scope: Scope.REQUEST,
    },
  ],
  controllers: [ussdController],
})
export class ussdModule {}
