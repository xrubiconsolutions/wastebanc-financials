import { Injectable } from '@nestjs/common';
import {
  OneSignalAppClient,
  NotificationByDeviceBuilder,
} from 'onesignal-api-client-core';

@Injectable()
export class onesignalService {
  private client: any;
  constructor() {
    this.client = new OneSignalAppClient(
      `${process.env.ONESIGNAL_APP_ID}`,
      `${process.env.ONESIGNAL_TOKEN}`,
    );
  }

  async sendPushNotification(message: string, onesignalId: string) {
    const input = new NotificationByDeviceBuilder()
      .setIncludeExternalUserIds([onesignalId])
      .notification()
      .setContents({ en: message })
      .build();
    const result = await this.client.createNotification(input);
    return result;
  }
}
