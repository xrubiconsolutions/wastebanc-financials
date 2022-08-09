import { SlackService } from './../notification/slack/slack.service';
import { InitiateDTO } from './disbursement.dto';
import { DisbursementService } from './disbursement.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/api/disbursement')
export class DisbursementController {
  constructor(
    private readonly disbursementService: DisbursementService,
    private slackService: SlackService,
  ) {}

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
      console.log(error);
      return res.status(error.httpCode || 500).json({
        message: error.message || 'Payout request failed',
        error: true,
      });
    }
  }
}
