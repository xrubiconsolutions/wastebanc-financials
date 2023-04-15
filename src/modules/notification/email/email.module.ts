import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { slackModule } from '../slack/slack.module';
import { PartnerModule } from '../../partners/partner.module';
import { emailService } from './email.service';

@Module({
  imports: [HttpModule, slackModule, PartnerModule],
  providers: [emailService],
  controllers: [],
  exports: [emailService],
})
export class emailModule {}
