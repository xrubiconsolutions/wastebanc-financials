import {
  Charity,
  CharityPaymentSchema,
} from './../schemas/charitypayment.schema';
import {
  DisbursementRequest,
  DisbusmentRequestSchema,
} from './../schemas/disbursementRequest.schema';
import {
  Transaction,
  TransactionSchema,
} from './../schemas/transactions.schema';
import { slackModule } from './../notification/slack/slack.module';
import { DisbursementModule } from './../disbursement/disbursement.module';
import { MiscModule } from './../misc/misc.module';
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
import { Pay, PaySchema } from '../schemas/payment.schema';
import { PartnerModule } from '../partners/partner.module';
import { HttpModule } from '@nestjs/axios';

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
      { name: Transaction.name, schema: TransactionSchema },
      { name: Pay.name, schema: PaySchema },
      { name: DisbursementRequest.name, schema: DisbusmentRequestSchema },
      { name: Charity.name, schema: CharityPaymentSchema },
    ]),
    smsModule,
    onesignalModule,
    MiscModule,
    DisbursementModule,
    slackModule,
    PartnerModule,
    HttpModule,
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
