import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
} from './sterlingBank.dto';
import { sterlingBankService } from './sterlingBank.service';
import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('/api/sterling')
export class SterlingController {
  constructor(private readonly sterlingService: sterlingBankService) {}

  @Get('/banklist')
  async bankList() {
    return await this.sterlingService.BankList();
  }

  @Post('/nameInquiry')
  async nameInquiry(@Body() params: nipInquiryDTO) {
    return await this.sterlingService.nipNameInquiry(params);
  }

  @Post('/generateVirtualAccount')
  async virtualAccount(@Body() params: GenerateVirtualAccountDTO) {
    return await this.sterlingService.generateVirtualAccount(params);
  }

  @Post('/nipTransfer')
  async nipTransfer(@Body() params: nipTransferDTO) {
    return await this.sterlingService.nipTransfer(params);
  }

  @Post('/intraBankTransfer')
  async intraBankTransfer(@Body() params: intraBankDTO) {
    return await this.sterlingService.intraBankTransfer(params);
  }
}
