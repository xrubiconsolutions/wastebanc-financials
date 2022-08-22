import { User, UserSchema } from './../schemas/user.schema';
import {
  Transaction,
  TransactionSchema,
} from './../schemas/transactions.schema';
import { Pay, PaySchema } from './../schemas/payment.schema';
import { slackModule } from './../notification/slack/slack.module';
import { PartnerModule } from './../partners/partner.module';
import {
  notification,
  notificationSchema,
} from './../schemas/notification.schema';
import { onesignalModule } from './../notification/onesignal/onesignal.module';
import { schedules, schedulesSchema } from './../schemas/schedule.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { cronService } from './crons.service';
import { Module } from '@nestjs/common';
import {
  DisbursementRequest,
  DisbusmentRequestSchema,
} from '../schemas/disbursementRequest.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: schedules.name, schema: schedulesSchema },
      { name: notification.name, schema: notificationSchema },
      { name: DisbursementRequest.name, schema: DisbusmentRequestSchema },
      { name: Pay.name, schema: PaySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    onesignalModule,
    PartnerModule,
    slackModule,
  ],
  providers: [cronService],
})
export class cronsModule {}
