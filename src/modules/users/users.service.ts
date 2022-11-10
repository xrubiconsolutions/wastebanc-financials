import { SlackService } from './../notification/slack/slack.service';
import { partnerService } from './../partners/partnersService';
import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { GenerateVirtualAccountDTO } from './../partners/sterlingBank/sterlingBank.dto';
import { User, UserDocument } from './../schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { env } from '../../utils';

@Injectable()
export class userService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private partnerservice: partnerService,
    private slackService: SlackService,
  ) {}

  async openSAFAccount(params: GenerateVirtualAccountDTO) {
    const user = await this.userModel.findOne({
      phone: params.PhoneNumber,
    });

    if (!user)
      throw new UnprocessableEntityError({
        message: 'PhoneNumber does not exist',
        verboseMessage: 'PhoneNumber does not exist',
      });

    const partnerName = env('PARTNER_NAME');
    let accountNo = env('TEST_ACCOUNT');
    let bankName = env('TEST_NAME');
    let cifNo = env('TEST_CIFO');
    let bankCode = env('PARTNER_CODE');
    if (partnerName != 'pakam') {
      const partnerData = {
        partnerName,
        action: 'virtualAccount',
        data: params,
      };
      const { success, error, partnerResponse } =
        await this.partnerservice.initiatePartner(partnerData);
      if (!success) {
        await this.sendPartnerFailedNotification(
          partnerName,
          error,
          'virtualAccount',
          user,
        );
      }

      accountNo = partnerResponse.AccountNo || partnerResponse.data.AccountNo;
      cifNo = partnerResponse.cifNo || partnerResponse.data.cifNo;
    }
    await this.userModel.updateOne(
      { _id: user._id },
      {
        accountNo,
        cifNo,
        bankCode,
        bankName,
      },
    );

    return {
      fullname: user.fullname,
      phoneNumber: user.phone,
      accountNo,
    };
  }

  private async sendPartnerFailedNotification(
    partnerName: string,
    message: string,
    method: string,
    user: User,
  ) {
    const slackNotificationData = {
      category: 'request',
      event: 'failed',
      data: {
        requestFailedType: 'saf_account_opening',
        partnerName,
        fullname: user.fullname,
        phone: user.phone,
        message,
        method,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  }
}
