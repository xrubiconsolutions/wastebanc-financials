import {
  userActivities,
  userActivitiesSchema,
} from './../schemas/activitesModel';
import { wastepickerdisursmentService } from './wastepickerDisbursementService';
import { CollectorPay } from './../schemas/wastepickerPayment.schema';
import { Collector, CollectorSchema } from './../schemas/collector.schema';
import { PartnerModule } from './../partners/partner.module';
import {
  Organisation,
  OrganisationSchema,
} from './../schemas/organisation.schema';
import { smsModule } from './../notification/sms/sms.module';
import { slackModule } from './../notification/slack/slack.module';
import {
  Charity,
  CharityPaymentSchema,
} from './../schemas/charitypayment.schema';
import { CharityOrganisationSchema } from './../schemas/charityorganisation.schema';
import { Pay, PaySchema } from './../schemas/payment.schema';
import { User, UserSchema } from './../schemas/user.schema';
import { DisbursementService } from './disbursement.service';
import { Module, Scope } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../schemas/transactions.schema';
import {
  DisbursementRequest,
  DisbusmentRequestSchema,
} from '../schemas/disbursementRequest.schema';
import { CharityOrganisation } from '../schemas/charityorganisation.schema';
import { DisbursementController } from './disbursement.controller';
import moment from 'moment-timezone';
import { Partner, PartnerSchema } from '../schemas/partner.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: DisbursementRequest.name, schema: DisbusmentRequestSchema },
      { name: Pay.name, schema: PaySchema },
      { name: CharityOrganisation.name, schema: CharityOrganisationSchema },
      { name: Charity.name, schema: CharityPaymentSchema },
      { name: Organisation.name, schema: OrganisationSchema },
      { name: Partner.name, schema: PartnerSchema },
      { name: Collector.name, schema: CollectorSchema },
      { name: CollectorPay.name, schema: CollectorSchema },
      { name: userActivities.name, schema: userActivitiesSchema },
    ]),
    slackModule,
    smsModule,
    PartnerModule,
  ],
  providers: [
    DisbursementService,
    wastepickerdisursmentService,
    {
      provide: 'moment',
      useFactory: async () => moment(new Date()),
      scope: Scope.REQUEST,
    },
  ],
  controllers: [DisbursementController],
})
export class DisbursementModule {}
