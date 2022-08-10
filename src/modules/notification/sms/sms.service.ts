import { lastValueFrom, Observable } from 'rxjs';
import { smsRequirments } from './sms.enum';
import { OtpDTO, smsDTO } from './sms.dto';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AxiosResponse } from 'axios';

@Injectable()
export class smsService {
  constructor(private readonly httpService: HttpService) {}

  @OnEvent('sms.otp')
  async sendOTP(params: OtpDTO) {
    try {
      const smsData = this.getOTPData(params);
      const smsResponse = await lastValueFrom(
        this.sendPostRequest(smsData, 'sms/send'),
      );
      console.log(smsResponse.data);
      return smsResponse.data;
    } catch (error: any) {
      Logger.error({ error, params });
      throw new Error(error.message);
    }
  }

  async sendSms(params: smsDTO) {
    try {
      const smsData = this.getSMSData(params);
      const smsResponse = await lastValueFrom(
        this.sendPostRequest(smsData, 'sms/send'),
      );
      console.log(smsResponse.data);
      return smsResponse.data;
    } catch (error) {
      Logger.error({ error, params });
      throw new Error(error.message);
    }
  }

  private getOTPData(params: OtpDTO) {
    const phoneNo = String(params.phone).substring(1, 11);
    const message = `${params.token} is your OTP for Payment request on Pakam. OTP is valid for 5 minutes`;
    return this.smsData({ phoneNo, message });
  }

  private getSMSData(params: smsDTO) {
    const phoneNo = String(params.phone).substring(1, 11);
    const message = `Dear ${params.organisationName}, a user named ${params.userName}`;
    return this.smsData({ phoneNo, message });
  }

  private smsData(params: any) {
    return {
      api_key: process.env.TERMII_KEY,
      type: smsRequirments.type,
      to: `+234${params.phoneNo}`,
      from: smsRequirments.from,
      channel: smsRequirments.channel,
      sms: params.message,
    };
  }

  private sendPostRequest(
    params: any,
    url: string,
  ): Observable<AxiosResponse<any>> {
    url = `${process.env.TERMII_URL}sms/send`;
    const result = this.httpService.post(url, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return result;
  }
}
