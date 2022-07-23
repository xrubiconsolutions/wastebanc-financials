import { lastValueFrom, Observable } from 'rxjs';
import { generateReference } from './../../../utils/misc';
import { smsRequirments } from './sms.enum';
import { smsDTO } from './sms.dto';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AxiosResponse } from 'axios';

@Injectable()
export class smsService {
  constructor(private readonly httpService: HttpService) {}

  @OnEvent('sms.notification')
  async sendMessage(params: smsDTO) {
    try {
      const smsData = this.getsmsData(params);
      const smsResponse = await lastValueFrom(
        this.sendPostRequest(smsData, 'sms/send'),
      );
      Logger.log({ smsResponse, smsData });
      return smsResponse.data;
    } catch (error: any) {
      Logger.error({ error, params });
      throw new Error(error.message);
    }
  }

  private getsmsData(params: smsDTO) {
    const phoneNo = String(params.phone).substring(1, 11);
    const token = generateReference(4, false);
    const message = `${token} is your OTP for Payment request on Pakam. OTP is valid for 5 minutes`;
    return {
      api_key: process.env.TERMII_KEY,
      type: smsRequirments.type,
      to: `+234${phoneNo}`,
      from: smsRequirments.from,
      channel: smsRequirments.channel,
      sms: message,
    };
  }

  private sendPostRequest(
    params: any,
    url: string,
  ): Observable<AxiosResponse<any>> {
    url = `${process.env.TERMII_URL}sms/send`;
    const result = this.httpService.post(url, JSON.stringify(params));
    return result;
  }
}
