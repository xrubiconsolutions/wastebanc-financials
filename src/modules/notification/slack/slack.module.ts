import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [HttpModule],
  providers: [SlackService],
  controllers: [SlackController],
  exports: [SlackService],
})
export class slackModule {}
