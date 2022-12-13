import { partnerService } from './../partners/partnersService';
import { resolveAccountDTO } from './../partners/paystack/paystack.dto';
import { Collector, collectorDocument } from './../schemas/collector.schema';
import { Partner, PartnerDocument } from './../schemas/partner.schema';
import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { User, UserDocument } from './../schemas/user.schema';
import {
  disbursementRequestDTO,
  requestChargesDTO,
  safdisursementDTO,
  wastepickerdisursmentDTO,
} from './disbursementRequest.dto';
import { ResponseHandler, generateReference, env } from './../../utils/misc';
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
import { DisbursementStatus } from '../disbursement/disbursement.enum';
import { randomInt } from 'crypto';
import { SlackCategories } from '../notification/slack/slack.enum';

@Injectable()
export class DisbursementRequestService {
  private partnerName: string;
  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject('moment') private moment: moment.Moment,
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
    @InjectModel(Collector.name)
    private collectorModel: Model<collectorDocument>,
    private eventEmitter: EventEmitter2,
    private partnerservice: partnerService,
  ) {
    this.partnerName = process.env.PARTNER_NAME;
  }

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
      const min_withdrawalable_amount =
        process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;

      if (user.availablePoints < +min_withdrawalable_amount) {
        return ResponseHandler(
          'You do not have enough points to complete this transaction',
          400,
          true,
          null,
        );
      }

      const condition = {
        paid: false,
        requestedForPayment: false,
        cardID: user._id,
      };

      const transactions: any[] = await this.transactionModel
        .find(condition)
        .select('_id');
      if (transactions.length <= 0)
        return ResponseHandler(
          'User has no unpaid transactions',
          400,
          false,
          null,
        );

      params.transactions = transactions;

      await this.disbursementModel.updateMany(
        {
          user: params.userId,
          type: params.type,
          status: DisbursementStatus.initiated,
        },
        {
          status: DisbursementStatus.cancelled,
        },
      );

      Promise.all(
        transactions.map(async (transaction) => {
          const tran = await this.transactionModel.findById(transaction);
          await this.transactionModel.updateOne(
            { _id: transaction },
            { $set: { coinStr: tran.coin, weightStr: tran.weight } },
          );
        }),
      );

      const value = await this.disbursementData(params);
      console.log('disbursement values', value);
      const disbursment = await this.disbursementModel.create(value);
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
        'OTP has been sent to your phone number',
        200,
        false,
        result,
      );
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async requestSAFDisbursement(params: safdisursementDTO) {
    try {
      const min_withdrawalable_amount =
        process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;
      const user = await this.userModel.findById(params.userId);
      if (!user) return ResponseHandler('User not found', 400, true, null);
      if (user.availablePoints < +min_withdrawalable_amount) {
        return ResponseHandler(
          'You do not have enough points to complete this transaction',
          400,
          true,
          null,
        );
      }
      const condition = {
        paid: false,
        requestedForPayment: false,
        cardID: user._id,
      };
      const transactions = await this.transactionModel
        .find(condition)
        .select('_id');
      if (transactions.length <= 0)
        return ResponseHandler(
          'User has no unpaid transactions',
          400,
          false,
          null,
        );
      await this.disbursementModel.updateMany(
        {
          user: params.userId,
          status: DisbursementStatus.initiated,
        },
        {
          status: DisbursementStatus.cancelled,
        },
      );
      const verifySAF = await this.verifySAFAccount(user);
      const disbursment = await this.disbursementModel.create({
        ...verifySAF,
        transactions,
      });
      this.eventEmitter.emit('sms.otp', {
        phone: user.phone,
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
        'OTP has been sent to your phone number',
        200,
        false,
        result,
      );
    } catch (error) {
      console.log(error);
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async wastepickerRequestDisbursement(params: wastepickerdisursmentDTO) {
    try {
      const min_withdrawalable_amount =
        process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;
      const collector = await this.collectorModel.findById(params.collectorId);
      if (!collector)
        return ResponseHandler('Collector not found', 400, true, null);

      if (collector.pointGained <= +min_withdrawalable_amount) {
        return ResponseHandler(
          'You do not have enough points to complete this transaction',
          400,
          true,
          null,
        );
      }

      const transactions = await this.transactionModel
        .find({
          completedBy: collector._id.toString(),
        })
        .select('_id');

      if (!transactions) {
        return ResponseHandler(
          'Waste picker has no unpaid transactions',
          400,
          true,
          null,
        );
      }

      await this.disbursementModel.updateMany(
        {
          collector: params.collectorId,
          type: params.type,
          status: DisbursementStatus.initiated,
        },
        {
          status: DisbursementStatus.cancelled,
        },
      );

      const value = await this.getwastePickerDisbursementDate(collector);

      const disbursment = await this.disbursementModel.create({
        ...value,
        transactions,
      });
      this.eventEmitter.emit('sms.otp', {
        phone: collector.phone,
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
        'OTP has been sent to your phone number',
        200,
        false,
        result,
      );
    } catch (error) {
      console.log(error);
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async wastepickerRequestSummary(params: wastepickerdisursmentDTO) {
    try {
      const collector = await this.collectorModel.findById(params.collectorId);
      if (!collector)
        return ResponseHandler('collector not found', 400, true, null);

      if (
        collector.pointGained <= +process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT
      ) {
        const result = {
          withdrawalAmount: 0,
          charge: 0,
          accountDetails: collector.account,
        };
        return ResponseHandler(
          'waste picker withdrawal summary',
          200,
          false,
          result,
        );
      }

      const result = {
        withdrawalAmount: Number(collector.pointGained) - 100,
        charge: 100,
        accountDetails: collector.account,
      };
      return ResponseHandler(
        'waste picker withdrawal summary',
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

    const transactionIds = params.transactions.map((transaction: any) => {
      return transaction._id;
    });

    params.destinationBankCode = await this.getBank(params.destinationBankCode);
    params.amount = user.availablePoints;
    params.charge = +env('APP_CHARGE');
    params.reference = `${generateReference(7, false)}${Date.now()}`;
    return {
      userType: 'household',
      user,
      withdrawalAmount: Number(user.availablePoints) - params.charge,
      otpExpiry: this.moment.add(30, 'm'),
      otp: generateReference(4, false),
      referenceCode: `${generateReference(6, false)}${Date.now()}`,
      principalIdentifier: `${generateReference(8, false)}${Date.now()}`,
      paymentReference: `Pakam Transfer to ${params.bankName}|${params.beneName}`,
      transactionType,
      transactions: transactionIds,
      ...params,
    };
  }

  private async getwastePickerDisbursementDate(collector: collectorDocument) {
    const destinationBankCode = await this.getBank(
      collector.account.bankSortCode,
    );

    const collectorBankName = collector.account.bankName.toLowerCase();

    const response: any = await this.verifyAccount(collector);
    return {
      userType: 'collector',
      collector: collector._id,
      amount: collector.pointGained,
      withdrawalAmount: Number(collector.pointGained) - 100,
      otpExpiry: this.moment.add(30, 'm'),
      otp: generateReference(4, false),
      referenceCode: `${generateReference(6, false)}${Date.now()}`,
      principalIdentifier: `${generateReference(8, false)}${Date.now()}`,
      paymentReference: `Pakam Transfer to ${collector.account.bankName}|${collector.account.accountName}`,
      beneName: response.account_name,
      destinationBankCode,
      destinationAccount: collector.account.accountNo,
      charge: +env('APP_CHARGE'),
      transactionType: collectorBankName == 'sterling bank' ? '0' : '1',
      nesidNumber: response.neSid,
      nerspNumber: response.neresp,
      bvn: response.beneBVN,
      kycLevel: response.kycLevel,
    };
  }

  private async verifyAccount(collector: collectorDocument) {
    const bank = await this.getBank(collector.account.bankSortCode);
    if (!bank) {
      throw new UnprocessableEntityError({
        message:
          'Invalid account details reqistered, Please contact customer service',
        verboseMessage: 'Invalid account details',
      });
    }
    const ref = randomInt(1000000);
    console.log('collector', collector);

    const params = {
      accountNumber: collector.account.accountNo,
      BankCode: bank,
      referenceId: ref.toString(),
      userId: collector._id.toString(),
      userType: 'waste-picker',
    };

    const result = await this.callPartner(params, env('PARTNER_NAME'));
    if (!result.success) {
      await this.sendPartnerFailedNotification(
        result.error,
        params,
        'resolveAccountNumber',
      );
      throw new UnprocessableEntityError({
        message: 'Account number not verified',
        verboseMessage: result.error,
      });
    }

    return result.partnerResponse;
  }

  private async verifySAFAccount(user: User) {
    const bank = await this.getBank(user.bankCode);
    if (!bank)
      throw new UnprocessableEntityError({
        message:
          'Invalid account details reqistered, Please contact customer service',
        verboseMessage: 'Invalid account details',
      });
    const ref = randomInt(1000000);
    const params = {
      accountNumber: user.accountNo,
      BankCode: bank,
      referenceId: ref.toString(),
      userId: user._id.toString(),
    };
    const result = await this.callPartner(params, env('PARTNER_NAME'));
    if (!result.success) {
      await this.sendPartnerFailedNotification(
        result.error,
        params,
        'resolveAccountNumber',
      );
      throw new UnprocessableEntityError({
        message: 'Account number not verified',
        verboseMessage: result.error,
      });
    }
    return {
      nesidNumber: result.partnerResponse.neSid,
      nerspNumber: result.partnerResponse.neresp,
      bvn: result.partnerResponse.beneBVN,
      kycLevel: result.partnerResponse.kycLevel,
      userType: 'user',
      user: user._id,
      otpExpiry: this.moment.add(30, 'm'),
      otp: generateReference(4, false),
      referenceCode: `${generateReference(6, false)}${Date.now()}`,
      principalIdentifier: `${generateReference(8, false)}${Date.now()}`,
      paymentReference: `Pakam Transfer to ${user.bankCode}|${user.fullname}`,
      beneName: result.partnerResponse.account_name,
      destinationBankCode: user.bankCode,
      destinationAccount: user.accountNo,
      bankName: user.bankName,
      charge: +env('SAF_CHARGE'),
      transactionType: user.bankName.toLowerCase() == 'saf' ? '0' : '1',
      withdrawalAmount: user.availablePoints - +env('APP_CHARGE'),
      amount: user.availablePoints,
      reference: `${generateReference(7, false)}${Date.now()}`,
    };
  }

  private async getBank(bankCode: string) {
    console.log('bankcode', bankCode);
    const partner = await this.partnerModel.findOne({
      name: env('PARTNER_NAME'),
    });
    const bank = banklist.find((bank: any) => {
      return bank.value == bankCode;
    });
    console.log('bank', bank);

    return bank[partner.sortCode];
  }

  private async callPartner(params: resolveAccountDTO, partnerName) {
    const partnerData = {
      partnerName,
      action: 'resolveAccount',
      data: params,
    };

    const partnerResponse = await this.partnerservice.initiatePartner(
      partnerData,
    );

    return partnerResponse;
  }

  private sendPartnerFailedNotification = async (
    message: any,
    params: any,
    method: string,
  ) => {
    const slackNotificationData = {
      category: SlackCategories.Requests,
      event: 'failed',
      data: {
        requestFailedType: 'partner_account_verification_failed',
        partnerName: this.partnerName,
        message,
        method,
        ...params,
      },
    };
    this.eventEmitter.emit('slack.notification', slackNotificationData);
    return;
  };
}
