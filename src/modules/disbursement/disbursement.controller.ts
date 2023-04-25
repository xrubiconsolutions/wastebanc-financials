import { wastepickerdisursmentService } from './wastepickerDisbursementService';
import { SlackService } from './../notification/slack/slack.service';
import {
  InitiateDTO,
  initiateWastePickerWithdrawalDTO,
} from './disbursement.dto';
import { DisbursementService } from './disbursement.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { paymentToPayoutAccountDTO } from '../partners/sterlingBank/sterlingBank.dto';
import { partnerService } from '../partners/partnersService';

@Controller('/api/disbursement')
export class DisbursementController {
  private partnerName: string;
  constructor(
    private readonly disbursementService: DisbursementService,
    private slackService: SlackService,
    private readonly collectordisbursementService: wastepickerdisursmentService,
    private partnerservice: partnerService,
  ) {
    this.partnerName = process.env.PARTNER_NAME;
  }

  @Post('/initiate')
  async initiateDisbursement(
    @Body() params: InitiateDTO,
    @Res() res: Response,
  ) {
    try {
      const result = await this.disbursementService.initiate(params);
      if (result == 'Payout Request Failed') {
        return res.status(400).json({
          message: result,
          error: false,
          data: result,
        });
      }
      return res.status(200).json({
        message: 'Payment initated successfully',
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

  @Post('/collector/initiate')
  async initiateCollectorPayment(
    @Body() params: initiateWastePickerWithdrawalDTO,
    @Res() res: Response,
  ) {
    try {
      const result = await this.collectordisbursementService.initate(params);
      if (result == 'Payout Request Failed') {
        return res.status(400).json({
          message: result,
          error: false,
          data: result,
        });
      }
      return res.status(200).json({
        message: 'Payment initated successfully',
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

  @Post('/account/funding')
  async requestAccountFunding(
    @Body() params: paymentToPayoutAccountDTO,
    @Res() res: Response,
  ) {
    const result = await this.disbursementService.fundAccount(params);
    return res.status(result.statusCode).json(result);
  }
}
