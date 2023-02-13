import { ussdValues } from './ussd.dto';
import { ussdService } from './ussd.service';
import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/connect/ussd')
export class ussdController {
  constructor(private readonly UssdService: ussdService) {}

  @Post('/initiate')
  async initateUssd(@Res() res: Response, @Body() params: ussdValues) {
    console.log('body', params);
    const result = await this.UssdService.initate(params);
    return res.status(200).json(result);
  }

  @Post('/payment/datasync')
  async initatePaymentAsync(@Res() res: Response, @Body() params: any) {
    console.log('body', params);
    return res.status(200).json({ ...params });
  }
}
