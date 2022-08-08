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

@Injectable()
export class MiscService {
  private partnerName: string;
  constructor(
    private partnerservice: partnerService,
    private eventEmiiter: EventEmitter2,

    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {
    this.partnerName = process.env.PARTNER_NAME;
  }
  async banklist() {
    try {
      const s = await this.partnerservice.initiatePartner({
        partnerName: process.env.PARTNER_NAME,
        action: 'bankLists',
        data: null,
      });
      console.log('s', s);
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
    try {
      const results = await this.partnerservice.initiatePartner({
        partnerName: process.env.PARTNER_NAME,
        action: 'bankLists',
        data: null,
      });
      return ResponseHandler('success', 200, false, results);
    } catch (error) {
      console.log('error', error);
      Logger.error(error);
      return ResponseHandler(error, 500, true, null);
    }
  }

  async resolveAccountNumber(params: resolveAccountDTO) {
    try {
      const bank = this.getBank(params.BankCode);
      const partner = await this.partnerModel.findOne({
        name: this.partnerName,
      });
      params.BankCode = bank[partner.sortCode];
      const result = await this.callPartner(params);
      return ResponseHandler('success', 200, false, result.data);
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
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

    if (!partnerResponse.error) {
      await this.sendPartnerFailedNotification(params);
    }

    return partnerResponse;
  };

  private sendPartnerFailedNotification = async (params: any) => {
    const slackNotificationData = {
      category: SlackCategories.Requests,
      event: 'failed',
      data: {
        requestFailedType: 'partner_account_verification_failed',
        partnerName: this.partnerName,
        ...params,
      },
    };
    this.eventEmiiter.emit('slack.notification', slackNotificationData);
    return;
  };

  private getBank = (bankCode: string) => {
    const bank = banklist.find((bank: any) => {
      return bank.value == bankCode;
    });
    return bank;
  };
}
