import {
  centralAccount,
  centralAccountDocument,
} from './../../schemas/centralAccount.schema';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { partnerService } from '../../partners/partnersService';
import { SlackCategories } from '../slack/slack.enum';
import { SlackService } from '../slack/slack.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class emailService {
  private readonly logger = new Logger('email');
  constructor(
    private readonly httpService: HttpService,
    private partnerservice: partnerService,
    private slackService: SlackService,
    @InjectModel(centralAccount.name)
    private centralaccount: Model<centralAccountDocument>,
  ) {}

  async checkAccountBalance() {
    try {
      await this.callPartner();
    } catch (error: any) {
      Logger.error({ error });
      throw new Error(error.message);
    }
  }

  private async callPartner(): Promise<void> {
    const result = await this.partnerservice.initiatePartner({
      partnerName: process.env.PARTNER_NAME,
      action: 'getCustomerInformation',
      data: { accountNumber: process.env.PAKAM_ACCOUNT },
    });

    if (!result.success) {
      await this.partnerFailedNotification(
        result.error,
        process.env.PARTNER_NAME,
        'getCustomerInformation',
      );
      this.logger.log({
        partnerResponse: result.partnerResponse,
      });
    }
    // console.log('check resp', result.partnerResponse.Data);
    const res = result.partnerResponse.Data;
    const baseAmount = Number(process.env.BASE_AMOUNT);
    const amountBalance = Number(res.availableBalance);
    if (baseAmount >= amountBalance) {
      // send email too
      await this.notifyTeamOfBalance(res.availableBalance);
    }
    const acc = await this.centralaccount.findOne({
      bank: process.env.PARTNER_NAME,
    });

    acc.acnumber = process.env.PAKAM_ACCOUNT;
    acc.balance = res.availableBalance;
    acc.name = res.name;
    acc.save();
    console.log('acc', acc);
  }

  private async partnerFailedNotification(
    message: string,
    partnerName: string,
    method: string,
  ) {
    const slackNotificationData = {
      category: SlackCategories.Requests,
      event: 'lowBalance',
      data: {
        requestFailedType: 'Account_balance_check',
        partnerName,
        accountNumber: process.env.PAKAM_ACCOUNT,
        message,
        method,
      },
    };
    return this.slackService.sendMessage(slackNotificationData);
  }

  private async notifyTeamOfBalance(balance: string) {
    const slackNotificationData = {
      category: SlackCategories.Requests,
      event: 'lowBalance',
      data: {
        requestFailedType: 'Account_balance_check',
        partnerName: process.env.PARTNER_NAME,
        accountNumber: process.env.PAKAM_ACCOUNT,
        balance,
      },
    };
    return this.slackService.sendMessage(slackNotificationData);
  }
}
