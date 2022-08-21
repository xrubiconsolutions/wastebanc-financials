import { User } from './../schemas/user.schema';
import { onesignalService } from './../notification/onesignal/onesignal.service';
import { schedules, schedulesDocument } from './../schemas/schedule.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';

@Injectable()
export class cronService {
  private readonly logger = new Logger(cronService.name);

  constructor(
    @InjectModel(schedules.name)
    private scheduleModel: Model<schedulesDocument>,
    private onesignal: onesignalService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async verifyTransaction() {
    this.logger.debug('called every 5 seconds');
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async setPickUpAsMissed() {
    const message =
      'Your pick up schedule was missed yesterday. Kindly reschedule';
    const currentDate = new Date().setHours(0, 0, 0, 0);
    const pickupSchedules = await this.scheduleModel.aggregate([
      {
        $match: {
          completionStatus: 'pending',
          expiryDuration: {
            $lt: new Date(currentDate).toISOString(),
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
      {
        $limit: 50,
      },
    ]);

    pickupSchedules.map(async (schedule: any) => {
      // update schedule as missed
      await this.scheduleModel.updateOne(
        { _id: schedule._id },
        { completionStatus: 'missed' },
      );

      // save notification
      // send push notification
    });

    this.logger.debug('current Date', pickupSchedules);
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async pickupScheduleRemainder() {
    this.logger.debug('current Date reminders');
  }

  //   private storeNotification(message: string, user: User) {}
  //   private sendPushNotification(message: string) {}
}
