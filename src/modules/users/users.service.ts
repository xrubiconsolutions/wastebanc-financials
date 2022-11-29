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

    const partnerData = {
      partnerName: env('PARTNER_NAME'),
      action: 'virtualAccount',
      data: params,
    };
    const { success, error, partnerResponse } =
      await this.partnerservice.initiatePartner(partnerData);
    if (!success) {
      await this.sendPartnerFailedNotification(
        env('PARTNER_NAME'),
        error,
        'virtualAccount',
        user,
      );
    }

    const accountNo =
      partnerResponse.AccountNo || partnerResponse.data.AccountNo;
    const cifNo = partnerResponse.cifNo || partnerResponse.data.cifNo;
    await this.userModel.updateOne(
      { _id: user._id },
      {
        accountNo,
        cifNo,
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
