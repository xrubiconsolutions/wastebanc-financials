import { Partner, PartnerDocument } from './../schemas/partner.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { resolveAccountDTO } from './../partners/paystack/paystack.dto';
import { partnerService } from '../partners/partnersService';
import { Injectable, Logger } from '@nestjs/common';
import { ResponseHandler } from '../../utils';
import banklist from './ngnbanklist.json';
import { SlackCategories } from '../notification/slack/slack.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyTransactionDTO } from '../partners/sterlingBank/sterlingBank.dto';
import { User, UserDocument } from '../schemas/user.schema';
import { requestChargesDTO } from '../disbursementRequest/disbursementRequest.dto';

@Injectable()
export class MiscService {
  private partnerName: string;
  constructor(
    private partnerservice: partnerService,
    private eventEmiiter: EventEmitter2,

    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.partnerName = process.env.PARTNER_NAME;
  }
  async banklist() {
    try {
      const results: any = [];
      banklist.map((bank: any) => {
        results.push({ name: bank.name, value: bank.value });
      });
      return ResponseHandler('success', 200, false, results);
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async sterlingBanks() {
    const SterlingbankLists = await this.partnerservice.initiatePartner({
      partnerName: process.env.PARTNER_NAME,
      action: 'bankLists',
      data: null,
    });
    if (!SterlingbankLists.success) {
      return ResponseHandler('Error getting banks list', 400, true, null);
    }
    const results: any = [];

    const lists = JSON.parse(SterlingbankLists.partnerResponse);
    lists.Data.map((bank: any) => {
      results.push({ name: bank.BankName, value: bank.BankCode });
    });
    return ResponseHandler('success', 200, false, results);
  }

  async resolveAccountNumber(params: resolveAccountDTO) {
    const partner = await this.partnerModel.findOne({
      name: this.partnerName,
    });
    const bank = this.getBank(params.BankCode);
    if (!bank) {
      await this.sendPartnerFailedNotification(
        'Wrong Bank Code passed',
        params,
        'resolveAccountNumber',
      );
      return ResponseHandler(
        'Account number verification failed',
        400,
        true,
        null,
      );
    }
    params.BankCode = bank[partner.sortCode];
    params.userType = 'household';
    const result: any = await this.callPartner(params);
    if (!result.success) {
      await this.sendPartnerFailedNotification(
        result.error,
        params,
        'resolveAccountNumber',
      );
      return ResponseHandler(
        'Account number verification failed',
        400,
        true,
        null,
      );
    }
    const summary = await this.getWithdrawalAmountandCharges({
      bankCode: params.BankCode,
      userId: params.userId,
    });
    const res = {
      accountResult: result.partnerResponse,
      summary,
    };
    return ResponseHandler('success', 200, false, res);
  }

  async checkSterlingAccount(accountNumber: string) {
    console.log('accountNumber', accountNumber);
    const result = await this.partnerservice.initiatePartner({
      partnerName: process.env.PARTNER_NAME,
      action: 'getCustomerInformation',
      data: { accountNumber },
    });

    if (!result.success) {
      return ResponseHandler('Customer Account not found', 400, true, null);
    }
    console.log(result);
    return ResponseHandler('success', 200, false, result.partnerResponse);
  }

  async verifyTransfer(params: verifyTransactionDTO) {
    const result = await this.partnerservice.initiatePartner({
      partnerName: process.env.PARTNER_NAME,
      action: 'verifyTransfer',
      data: params,
    });

    if (!result.success) {
      console.log('error', result.error);
      return ResponseHandler('Transaction not found', 400, true, null);
    }
    console.log(result);
    return ResponseHandler('success', 200, false, result.partnerResponse);
  }

  private callPartner = async (params: resolveAccountDTO) => {
    const partnerData = {
      partnerName: this.partnerName,
      action: 'resolveAccount',
      data: params,
    };
    const partnerResponse = await this.partnerservice.initiatePartner(
      partnerData,
    );
    return partnerResponse;
  };

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
    this.eventEmiiter.emit('slack.notification', slackNotificationData);
    return;
  };

  private getBank = (bankCode: string) => {
    console.log('sort', bankCode);
    const bank = banklist.find((bank: any) => {
      return bank.value == bankCode;
    });
    return bank;
  };

  private getWithdrawalAmountandCharges = async (params: requestChargesDTO) => {
    console.log('params', params);
    const user = await this.userModel.findById(params.userId);
    const partner = await this.partnerModel.findOne({
      bankCode: params.bankCode,
    });
    const withdrawalAmount = +user.availablePoints - +partner.charges;
    return {
      charge: +partner.charges,
      withdrawalAmount,
    };
  };
}
