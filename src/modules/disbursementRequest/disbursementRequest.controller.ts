import { DisbursementRequestService } from './disbursementRequest.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  disbursementRequestDTO,
  requestChargesDTO,
  safdisursementDTO,
  wastepickerdisursmentDTO,
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

  @Post('/wastepicker/request/otp')
  async wastepickerOtpRequest(
    @Body() params: wastepickerdisursmentDTO,
    @Res() res: Response,
  ) {
    const result = await this.requestService.wastepickerRequestDisbursement(
      params,
    );
    if (result.error) return res.status(400).json(result);

    return res.status(200).json(result);
  }

  @Post('/saf/otp/request')
  async safOtpRequest(@Body() params: safdisursementDTO, @Res() res: Response) {
    const result = await this.requestService.requestSAFDisbursement(params);
    if (result.error) return res.status(400).json(result);
    return res.status(200).json(result);
  }
  @Post('/wastepicker/withdrawal/summary')
  async wastepickerSummary(
    @Body() params: wastepickerdisursmentDTO,
    @Res() res: Response,
  ) {
    const result = await this.requestService.wastepickerRequestSummary(params);
    return res.status(result.statusCode).json(result);
  }
}
