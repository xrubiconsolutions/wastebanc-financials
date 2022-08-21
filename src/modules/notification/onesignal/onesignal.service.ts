import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class onesignalService {
  async makeRequest(requestObj: any) {
    requestObj.headers = {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Basic ${process.env.ONESIGNAL_TOKEN}`,
    };
    requestObj.url = `${process.env.ONESIGNAL_URL}`;
    const result = await axios(requestObj);
    return result;
  }
  async sendPushNotification(message: string) {
    const body = {
      app_id: `${process.env.ONESIGNAL_APP_ID}`,
      contents: {
        en: `${message}`,
      },
    };
    const sendMessage = await this.makeRequest({
      method: 'post',
      data: body,
    });
    return sendMessage;
  }
}
