import { DisbursementRequestService } from './disbursementRequest.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  disbursementRequestDTO,
  requestChargesDTO,
} from './disbursementRequest.dto';
import { Response } from 'express';
@Controller('/api')
export class DisbursementRequestController {
  constructor(private readonly requestService: DisbursementRequestService) {}

  @Post('/request/otp')
  async otpRequest(
    @Body() params: disbursementRequestDTO,
    @Res() res: Response,
  ) {
    console.log('params', params);
    const result = await this.requestService.requestDisbursement(params);
    if (result.error) return res.status(400).json(result);

    return res.status(200).json(result);
  }

  @Post('/disbursement/charge')
  async disbursementCharge(
    @Body() params: requestChargesDTO,
    @Res() res: Response,
  ) {
    const result = await this.requestService.requestCharges(params);
    if (result.error) return res.status(400).json(result);

    return res.status(200).json(result);
  }
}
