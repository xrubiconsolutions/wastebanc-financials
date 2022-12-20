import { ussdService } from './ussd.service';
import { Controller, Get, Post, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';

@Controller('/connect/ussd')
export class ussdController {
  constructor(private readonly UssdService: ussdService) {}

  @Post('/initiate')
  async initateUssd(@Res() res: Response, @Req() req: Request) {
    const body = req.body;
    console.log('body', body);
    const result = await this.UssdService.initate();
    return res.status(200).json(result);
  }
}
