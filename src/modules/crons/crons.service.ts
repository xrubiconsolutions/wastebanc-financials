import { User, UserDocument } from './../schemas/user.schema';
import {
  Transaction,
  TransactionDocument,
} from './../schemas/transactions.schema';
import { Pay, PayDocument } from './../schemas/payment.schema';
import { SlackService } from './../notification/slack/slack.service';
import { partnerService } from './../partners/partnersService';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from './../schemas/disbursementRequest.schema';
import {
  notification,
  notificationDocument,
} from './../schemas/notification.schema';
import { onesignalService } from './../notification/onesignal/onesignal.service';
import { schedules, schedulesDocument } from './../schemas/schedule.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { DisbursementStatus } from '../disbursement/disbursement.enum';
import { env } from '../../utils';
import { SlackCategories } from '../notification/slack/slack.enum';

@Injectable()
export class cronService {
  private readonly logger = new Logger(cronService.name);

  constructor(
    @InjectModel(schedules.name)
    private scheduleModel: Model<schedulesDocument>,
    @InjectModel(notification.name)
    private notificationModel: Model<notificationDocument>,
    private onesignal: onesignalService,
    @InjectModel(DisbursementRequest.name)
    private disbursementRequestModel: Model<DisbursementRequestDocument>,
    private partnerservice: partnerService,
    private slackService: SlackService,
    @InjectModel(Pay.name) private payModel: Model<PayDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Cron(CronExpression.EVERY_5_HOURS)
  async verifyTransaction() {
    try {
      const requests = await this.disbursementRequestModel
        .find({
          status: DisbursementStatus.initiated,
        })
        .limit(50);

      if (requests.length > 0) {
        await this.handleVerification(requests);
      }
      this.logger.debug('Transaction Verifications');
    } catch (error) {
      this.logger.error(error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async setPickUpAsMissed() {
    const pickupSchedules = await this.scheduleModel.aggregate([
      {
        $match: {
          completionStatus: 'pending',
          expiryDuration: {
            $lt: new Date(),
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'client',
          foreignField: 'email',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    //console.log(pickupSchedules);

    if (pickupSchedules.length > 0) {
      Promise.all(
        pickupSchedules.map(async (schedule: any) => {
          const items = schedule.categories.map((category) => category.name);

          const message = `Your ${items} schedule was missed yesterday. Kindly reschedule`;

          await this.scheduleModel.updateOne(
            { _id: schedule._id },
            { completionStatus: 'missed' },
          );

          if (schedule.user && schedule.user.onesignal_id) {
            await this.storeNotification(message, schedule, 'pickup');
            await this.sendPushNotification(
              message,
              schedule.user.onesignal_id,
            );
          }
        }),
      );
    }

    this.logger.debug('missed pickup');
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async pickupScheduleRemainder() {
    const pickupSchedules = await this.scheduleModel.aggregate([
      {
        $match: {
          completionStatus: 'pending',
          collectorStatus: 'accept',
          reminder: true,
          reminderDate: {
            eq: new Date(),
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'client',
          foreignField: 'email',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    Promise.all(
      pickupSchedules.map(async (schedule: any) => {
        const message = `Your ${schedule.categories} schedule is today. Kindly be available to recieve our recycler`;
        if (schedule.user && schedule.user.onesignal_id) {
          await this.storeNotification(message, schedule, 'pickup');
          await this.sendPushNotification(message, schedule.user.onesignal_id);
        }
      }),
    );
    this.logger.debug('current Date reminders');
  }

  private async storeNotification(
    message: string,
    schedule: any,
    type: string,
  ) {
    return await this.notificationModel.create({
      title: 'Pick Schedule Missed',
      lcd: schedule.user.lcd,
      message,
      schedulerId: schedule.user._id,
      notification_type: type,
      scheduleId: schedule._id,
    });
  }
  private async sendPushNotification(message: string, onesignalId: string) {
    try {
      const result = await this.onesignal.sendPushNotification(
        message,
        onesignalId,
      );
      console.log('result', result);
      return result;
    } catch (error) {
      console.log('error', error);
    }
  }

  private async handleVerification(requests: DisbursementRequest[]) {
    requests.map(async (request) => {
      if (process.env.PARTNER_NAME == 'pakam') {
        // drop a slack notification to verify transaction manually
        this.logger.log({ manualVerification: request });
        await this.handleManualVerification(
          'Please handle verification manually',
          process.env.PARTNER_NAME,
          request,
        );
      } else {
        // call external partner
        this.logger.log({ partnerVerification: request });
        await this.callPartner(request);
      }
    });
  }

  private async callPartner(request: DisbursementRequest) {
    const result = await this.partnerservice.initiatePartner({
      partnerName: process.env.PARTNER_NAME,
      action: 'verifyTransfer',
      data: { requestId: request.reference, transactionType: request.type },
    });

    if (!result.success) {
      await this.rollBack(request);
      await this.partnerFaildedNotification(
        result.error,
        process.env.PARTNER_NAME,
        'verifyTransfer',
        request,
      );
      this.logger.log({
        partnerResponse: result.partnerResponse,
        params: request,
      });
      return request;
    }

    if (result.partnerResponse.Data.trim() == 'Failed') {
      // rollback the user money for some reason it failed on partners end
      await this.rollBack(request);
      await this.partnerFaildedNotification(
        'Transaction failed on partners end',
        process.env.PARTNER_NAME,
        'verifyTransfer',
        request,
      );
      this.logger.log({
        partnerResponse: result.partnerResponse,
        params: request,
      });
      return request;
    }

    await this.markTransactionAsPaid(request);

    return request;
  }

  private async partnerFaildedNotification(
    message: string,
    partnerName: string,
    method: string,
    request: DisbursementRequest,
  ) {
    const slackNotificationData = {
      category: SlackCategories.Disbursement,
      event: 'failed',
      data: {
        requestFailedType: 'partner_transaction_confirmation_failed',
        partnerName,
        id: request._id,
        reference: request.reference,
        withdrawalAmount: request.withdrawalAmount,
        userAvailablePoint: request.amount,
        accountName: request.beneName,
        accountNumber: request.destinationAccount,
        bankCode: request.destinationBankCode,
        charge: env('APP_CHARGE'),
        message,
        method,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  }

  private async rollBack(request: DisbursementRequest) {
    await this.payModel.deleteMany({
      reference: request.reference,
    });

    await this.transactionModel.updateMany(
      {
        _id: {
          $in: request.transactions,
        },
      },
      {
        paid: false,
        requestedForPayment: false,
        paymentResolution: '',
      },
    );

    await this.userModel.updateOne(
      { _id: request.user },
      { availablePoints: request.amount },
    );

    await this.disbursementRequestModel.findOneAndUpdate(
      { _id: request._id },
      { status: DisbursementStatus.failed },
    );

    return request;
  }

  private async markTransactionAsPaid(request: DisbursementRequest) {
    await this.payModel.updateMany(
      { reference: request.reference },
      { paid: true },
    );

    await this.transactionModel.updateMany(
      {
        _id: {
          $in: request.transactions,
        },
      },
      {
        paid: true,
        requestedForPayment: true,
        paymentResolution: '',
      },
    );

    await this.disbursementRequestModel.findOneAndUpdate(
      { _id: request._id },
      { status: DisbursementStatus.successful },
    );

    return request;
  }

  private async handleManualVerification(
    message: string,
    partnerName: string,
    request: DisbursementRequest,
  ) {
    const slackNotificationData = {
      category: SlackCategories.Requests,
      event: 'failed',
      data: {
        requestType: 'manual_transaction_verification',
        partnerName,
        id: request._id,
        reference: request.reference,
        amount: request.withdrawalAmount,
        userAvailablePoint: request.amount,
        accountName: request.beneName,
        accountNumber: request.destinationAccount,
        bankCode: request.destinationBankCode,
        charge: env('APP_CHARGE'),
        message,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  }
}
