import {
  notification,
  notificationSchema,
} from './../schemas/notification.schema';
import { onesignalModule } from './../notification/onesignal/onesignal.module';
import { schedules, schedulesSchema } from './../schemas/schedule.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { cronService } from './crons.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: schedules.name, schema: schedulesSchema },
      { name: notification.name, schema: notificationSchema },
    ]),
    onesignalModule,
  ],
  providers: [cronService],
})
export class cronsModule {}
