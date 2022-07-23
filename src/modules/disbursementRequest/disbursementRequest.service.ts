import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { User, UserDocument } from './../schemas/user.schema';
import { disbursementRequestDTO } from './disbursementRequest.dto';
import { ResponseHandler, generateReference } from './../../utils/misc';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from './../schemas/disbursementRequest.schema';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transactions.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DisbursementRequestService {
  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('moment') private moment: moment.Moment,
    private eventEmitter: EventEmitter2,
  ) {}

  // get disbursement charge

  async requestDisbursement(params: disbursementRequestDTO) {
    try {
      const value = await this.disbursementData(params);
      const disbursment = await this.disbursementModel.create(value);
      this.eventEmitter.emit('sms.notification', { phone: value.user.phone });
      return ResponseHandler('success', 200, false, disbursment);
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  private async disbursementData(params: disbursementRequestDTO) {
    const user = await this.userModel.findById(params.userId);
    if (!user)
      throw new UnprocessableEntityError({ message: 'User details incorrect' });

    return {
      user,
      otp: generateReference(4, false),
      ...params,
    };
  }
}
