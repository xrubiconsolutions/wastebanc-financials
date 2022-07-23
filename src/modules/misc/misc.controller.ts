import { MiscService } from './misc.service';
import { Controller, Get, Res } from '@nestjs/common';
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
}
