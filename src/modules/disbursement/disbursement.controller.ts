import { InitiateDTO } from './disbursement.dto';
import { DisbursementService } from './disbursement.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/api/disbursement')
export class DisbursementController {
  constructor(private readonly disbursementService: DisbursementService) {}

  @Post('/initiate')
  async initiateDisbursement(
    @Body() params: InitiateDTO,
    @Res() res: Response,
  ) {
    try {
      const result = await this.disbursementService.initiate(params);
      return res.status(200).json({
        message: result,
        error: false,
        data: result,
      });
    } catch (error) {
      return res.status(error.httpCode || 500).json({
        message: (error as Error).message,
        error: true,
      });
    }
  }
}
