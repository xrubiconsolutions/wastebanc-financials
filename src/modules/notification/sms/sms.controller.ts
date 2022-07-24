import { smsService } from './sms.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { smsDTO } from './sms.dto';
import { Response } from 'express';
@Controller('/api')
export class smsController {
  constructor(private readonly sms_service: smsService) {}

  @Post('/sms')
  async sendSms(@Body() params: smsDTO, @Res() res: Response) {
    const result = await this.sms_service.sendOTP(params);
    return res.status(200).json(result);
  }
}
