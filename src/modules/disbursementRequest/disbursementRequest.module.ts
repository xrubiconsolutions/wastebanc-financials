import { PartnerModule } from './../partners/partner.module';
import { Collector, CollectorSchema } from './../schemas/collector.schema';
import { Partner, PartnerSchema } from './../schemas/partner.schema';
import { slackModule } from './../notification/slack/slack.module';
import { DisbursementRequestController } from './disbursementRequest.controller';
import { DisbursementRequestService } from './disbursementRequest.service';
import { User, UserSchema } from './../schemas/user.schema';
import { TransactionSchema } from './../schemas/transactions.schema';
import {
  DisbursementRequest,
  DisbusmentRequestSchema,
} from './../schemas/disbursementRequest.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Module, Scope } from '@nestjs/common';
import { Transaction } from '../schemas/transactions.schema';
import moment from 'moment-timezone';
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: DisbursementRequest.name,
        useFactory: () => {
          const schema = DisbusmentRequestSchema;
          schema.pre('save', () => {
            schema.obj.withdrawalAmountStr =
              schema.obj.withdrawalAmount.toString();
          });
          return schema;
        },
      },
      {
        name: Transaction.name,
        useFactory: () => {
          const schema = TransactionSchema;
          return schema;
        },
      },
      {
        name: User.name,
        useFactory: () => {
          return UserSchema;
        },
      },
      {
        name: Partner.name,
        useFactory: () => {
          return PartnerSchema;
        },
      },
      {
        name: Collector.name,
        useFactory: () => {
          return CollectorSchema;
        },
      },
    ]),
    slackModule,
    PartnerModule,
  ],
  providers: [
    {
      provide: 'moment',
      useFactory: async () => moment(new Date()),
      scope: Scope.REQUEST,
    },
    DisbursementRequestService,
  ],
  controllers: [DisbursementRequestController],
})
export class DisbursementRequestModule {}
