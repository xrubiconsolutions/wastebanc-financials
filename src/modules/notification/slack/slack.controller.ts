import { Controller, Get, Logger, Res } from '@nestjs/common';
import { SlackCategories } from './slack.enum';
import { SlackService } from './slack.service';
import { Response } from 'express';

@Controller('/api/slack')
export class SlackController {
  constructor(private readonly slackservice: SlackService) {}

  @Get('/notification')
  async testSlackMessage(@Res() res: Response) {
    try {
      const result = await this.slackservice.sendMessage({
        category: SlackCategories.Requests,
        event: 'failed',
        data: {
          id: 'test',
        },
      });

      console.log('res', result);

      return res.status(200).json({
        message: 'message sent',
      });
    } catch (error: any) {
      Logger.error(error);

      return res.status(400).json({
        error: error.respons,
      });
    }
  }
}
