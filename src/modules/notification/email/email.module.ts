import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { slackModule } from '../slack/slack.module';
import { PartnerModule } from '../../partners/partner.module';
import { emailService } from './email.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  centralAccount,
  centralAccountSchema,
} from '../../schemas/centralAccount.schema';

@Module({
  imports: [
    HttpModule,
    slackModule,
    PartnerModule,
    MongooseModule.forFeature([
      { name: centralAccount.name, schema: centralAccountSchema },
    ]),
  ],
  providers: [emailService],
  controllers: [],
  exports: [emailService],
})
export class emailModule {}
