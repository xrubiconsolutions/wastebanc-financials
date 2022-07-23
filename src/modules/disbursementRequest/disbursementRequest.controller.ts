import { DisbursementRequestService } from './disbursementRequest.service';
import { Body, Controller, Post } from '@nestjs/common';
import { disbursementRequestDTO } from './disbursementRequest.dto';

@Controller('/api/user')
export class DisbursementRequestController {
  constructor(private readonly requestService: DisbursementRequestService) {}

  @Post('/request/otp')
  async otpRequest(@Body() params: disbursementRequestDTO) {
    return await this.requestService.requestDisbursement(params);
  }
}
