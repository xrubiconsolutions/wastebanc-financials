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
      const bank = this.getBank(params.bankCode);
      console.log('b', bank);
      let partner: Partner;
      if (!bank || bank == undefined) {
        partner = await this.partnerModel.findOne({
          $or: [
            { name: process.env.PARTNER_NAME },
            { bankCode: process.env.PARTNER_CODE },
          ],
        });
      } else {
        partner = await this.partnerModel.findOne({
          $or: [{ name: bank.name.toLowerCase() }, { bankCode: bank.value }],
        });
        if (!partner) {
          partner = await this.partnerModel.findOne({
            $or: [
              { name: process.env.PARTNER_NAME },
              { bankCode: process.env.PARTNER_CODE },
            ],
          });
        }
      }

      return ResponseHandler('success', 200, false, {
        bankName: partner.name,
        charge: partner.charges,
      });
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async requestDisbursement(params: disbursementRequestDTO) {
    try {
      const value = await this.disbursementData(params);
      const disbursment = await this.disbursementModel.create(value);
      this.eventEmitter.emit('sms.otp', { phone: value.user.phone });
      const result = {
        currency: disbursment.currency,
        charge: disbursment.charge,
        beneName: disbursment.beneName,
        destinationAccount: disbursment.destinationAccount,
        bankName: disbursment.bankName,
        destinationBankCode: disbursment.destinationBankCode,
      };
      return ResponseHandler('success', 200, false, result);
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

  private getBank(bankCode: string) {
    return banklist.find((bank: any) => {
      return bank.value == bankCode;
    });
  }
}
