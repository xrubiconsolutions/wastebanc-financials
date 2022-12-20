import { ussdService } from './ussd.service';
import { Controller, Get, Post, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/connect/ussd')
export class ussdController {
  constructor(private readonly UssdService: ussdService) {}

  @Post('/initiate')
  async initateUssd(@Res() res: Response) {
    const result = await this.UssdService.initate();
    return res.status(200).json(result);
  }
}
