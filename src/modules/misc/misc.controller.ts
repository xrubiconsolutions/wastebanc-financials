import { MiscService } from './misc.service';
import { Controller, Get } from '@nestjs/common';

@Controller('/api')
export class MiscController {
  constructor(private readonly miscService: MiscService) {}

  @Get('/all/banks')
  async getbanks() {
    return await this.miscService.banklist();
  }
}
