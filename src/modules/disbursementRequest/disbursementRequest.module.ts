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
    MongooseModule.forFeature([
      { name: DisbursementRequest.name, schema: DisbusmentRequestSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Partner.name, schema: PartnerSchema },
      { name: Collector.name, schema: CollectorSchema },
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
  exports: [DisbursementRequestService],
})
export class DisbursementRequestModule {}
