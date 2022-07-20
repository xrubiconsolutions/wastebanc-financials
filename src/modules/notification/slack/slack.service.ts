import { env } from './../../../utils/misc';
import {
  SendMessageDTO,
  SendNotificationDTO,
  SlackOptionsDTO,
} from './slack.dto';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { lastValueFrom, Observable } from 'rxjs';

import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class SlackService {
  constructor(private readonly httpService: HttpService) {}

  @OnEvent('slack.notification')
  async sendMessage(
    params: SendMessageDTO,
  ): Promise<Observable<AxiosResponse<any>>> {
    try {
      const slackReponse = await lastValueFrom(this.sendNotification(params));
      Logger.log({ slackReponse, params });
      return slackReponse.data;
    } catch (error: any) {
      Logger.error({ error, params });
      throw new Error(error.message);
    }
  }

  private sendNotification(
    slackData: SendNotificationDTO,
  ): Observable<AxiosResponse<any>> {
    const { category, event, data, options } = slackData;
    const url = this.chooseSlackURL(category, event);
    const formatData = this.jsonToSlackPayload(data, options);
    const notification = this.httpService.post(url, formatData, {
      proxy: false,
    });
    return notification;
  }

  private jsonToSlackPayload(
    data: any,
    options: SlackOptionsDTO | undefined = undefined,
  ) {
    const sourceEnvironment = env('APP_ENV');
    const { pretext, type, fallback } = options || {};
    const notificationColors: any = {
      danger: '#dc3545',
      success: '#2eb886',
      info: '#f8f9fa',
      warning: '#ffc107',
    };
    const footerIcon =
      'https://avatars.slack-edge.com/2020-11-03/1497706257840_865b7c387f67740e49aa_48.png';

    const payload: any = {
      pretext,
      fallback,
      color: notificationColors[type || 'success'],
      footer: `Pakam ${sourceEnvironment} environment`,
      footer_icon: footerIcon,
      ts: Math.floor(new Date().getTime() / 1000),
    };

    if (typeof data === 'string') {
      payload.text = data;
    }

    if (typeof data === 'object') {
      payload.fields = Object.keys(data).map((key) => ({
        title: this.formatKey(key),
        value: data[key],
        short: data[key].length < 30,
      }));
    }

    return { attachments: [payload] };
  }

  private chooseSlackURL(category: string, event: string) {
    const events: any = {
      disbursement: {
        initiated: env('SLACK_DISBURSEMENT_INITIATED_WEBHOOK_URL'),
        successful: env('SLACK_DISBURSEMENT_SUCCESSFUL_WEBHOOK_URL'),
        failed: env('SLACK_DISBURSEMENT_FAILED_WEBHOOK_URL'),
      },
    };

    return events[category][event];
  }

  private formatKey(key: string) {
    let words = key.split('_');
    words = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    return words.join(' ');
  }
}
