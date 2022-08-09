import { resolveAccountDTO } from './../partners/paystack/paystack.dto';
import { MiscService } from './misc.service';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/api')
export class MiscController {
  constructor(private readonly miscService: MiscService) {}

  @Get('/all/banks')
  async getbanks(@Res() res: Response) {
    const result = await this.miscService.banklist();
    if (result.error) return res.status(400).json(result);

    return res.status(200).json(result);
  }

  @Get('/resolve/account')
  async resolveAccount(
    @Query('account_number') account_number: string,
    @Query('bank_code') bank_code: string,
    @Res() res: Response,
  ) {
    const params: resolveAccountDTO = {
      accountNumber: account_number,
      BankCode: bank_code,
    };

    const result = await this.miscService.resolveAccountNumber(params);
    return res.status(result.statusCode).json(result);
  }

  @Get('/sterling/banks')
  async sterlingBanks(@Res() res: Response) {
    const result = await this.miscService.sterlingBanks();
    console.log('er', result);
    return res.status(result.statusCode).json(result);
  }
}
