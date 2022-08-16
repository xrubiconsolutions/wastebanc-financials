import { Partner, PartnerDocument } from './../schemas/partner.schema';
import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { User, UserDocument } from './../schemas/user.schema';
import {
  disbursementRequestDTO,
  requestChargesDTO,
} from './disbursementRequest.dto';
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
import banklist from '../misc/ngnbanklist.json';
@Injectable()
export class DisbursementRequestService {
  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('moment') private moment: moment.Moment,
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // get disbursement charge

  async requestCharges(params: requestChargesDTO) {
    try {
      const user = await this.userModel.findById(params.userId);

      if (!user) return ResponseHandler('Invalid User', 400, true, null);
      let charge = process.env.APP_CHARGE;
      const partner = await this.partnerModel.findOne({
        bankCode: params.bankCode,
      });

      if (partner) {
        charge = partner.charges;
      }

      const withdrawalAmount = Number(user.availablePoints) - Number(charge);
      return ResponseHandler('success', 200, false, {
        charge: +charge,
        withdrawalAmount,
      });
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async requestDisbursement(params: disbursementRequestDTO) {
    try {
      const user = await this.userModel.findById(params.userId);
      if (user.availablePoints <= 0) {
        throw new UnprocessableEntityError({
          message: 'You do not have enough points to complete this transaction',
          verboseMessage:
            'You do not have enough points to complete this transaction',
        });
      }

      if (user.availablePoints <= 0) {
        throw new UnprocessableEntityError({
          message: 'You do not have enough points to complete this transaction',
          verboseMessage:
            'You do not have enough points to complete this transaction',
        });
      }

      const condition = {
        paid: false,
        requestedForPayment: false,
        cardID: user._id,
        // completedBy: '',
      };

      const transactions = await this.transactionModel.find(condition);
      if (transactions.length <= 0)
        throw new UnprocessableEntityError({
          message: 'User has no unpaid transactions',
          verboseMessage: 'User has no unpaid transactions',
        });
      await this.disbursementModel.deleteOne({
        user: params.userId,
        type: params.type,
      });
      const value = await this.disbursementData(params);
      const disbursment = await this.disbursementModel.create(value);
      console.log('phone', value.user.phone);
      this.eventEmitter.emit('sms.otp', {
        phone: value.user.phone,
        token: disbursment.otp,
      });
      const result = {
        requestId: disbursment._id,
        currency: disbursment.currency,
        charge: disbursment.charge,
        beneName: disbursment.beneName,
        destinationAccount: disbursment.destinationAccount,
        bankName: disbursment.bankName,
        destinationBankCode: disbursment.destinationBankCode,
      };
      return ResponseHandler(
        'Verification token has been sent to your phone number',
        200,
        false,
        result,
      );
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  private async disbursementData(params: disbursementRequestDTO) {
    const user = await this.userModel.findById(params.userId);
    if (!user)
      throw new UnprocessableEntityError({ message: 'User details incorrect' });

    let transactionType = '0';
    if (
      params.bankName.toLowerCase() == 'sterling bank' ||
      params.bankName.toLowerCase() == 'sterling'
    ) {
      transactionType = '1';
    }
    params.amount = user.availablePoints;
    params.charge = 100;
    params.reference = `${generateReference(7, false)}${Date.now()}`;
    return {
      user,
      //withdrawalAmount: Number(user.availablePoints) - 100,
      withdrawalAmount: Number(user.availablePoints).toFixed(2),
      otpExpiry: this.moment.add(30, 'm'),
      otp: generateReference(4, false),
      referenceCode: `${generateReference(6, false)}${Date.now()}`,
      principalIdentifier: `${generateReference(8, false)}${Date.now()}`,
      paymentReference: `Pakam Transfer to ${params.bankName}|${params.beneName}`,
      transactionType,
      ...params,
    };
  }

  private getBank(bankCode: string) {
    return banklist.find((bank: any) => {
      return bank.value == bankCode;
    });
  }
}
