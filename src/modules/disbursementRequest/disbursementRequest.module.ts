import { DisbursementRequestController } from './disbursementRequest.controller';
import { DisbursementRequestService } from './disbursementRequest.service';
import { User, UserSchema } from './../schemas/user.schema';
import { transactionSchema } from './../schemas/transactions.schema';
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
      { name: Transaction.name, schema: transactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
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
