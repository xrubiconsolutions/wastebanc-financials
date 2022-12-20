import { ussdService } from './ussd.service';
import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('/connect/ussd')
export class ussdController {
  constructor(private readonly UssdService: ussdService) {}

  @Post('/initiate')
  async initateUssd(@Req() req: Request, @Res() res: Response) {
    const { body } = req;
    console.log(body);
    const result = await this.UssdService.initate();
    return res.status(200).json(result);
  }
}
