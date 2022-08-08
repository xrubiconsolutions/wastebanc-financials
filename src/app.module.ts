import { DisbursementModule } from './modules/disbursement/disbursement.module';
import { smsModule } from './modules/notification/sms/sms.module';
import { slackModule } from './modules/notification/slack/slack.module';
import { MiscModule } from './modules/misc/misc.module';
import { DisbursementRequestModule } from './modules/disbursementRequest/disbursementRequest.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PartnerModule } from './modules/partners/partner.module';
import { sterlingBankModule } from './modules/partners/sterlingBank/sterlingBank.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB'),
      }),
    }),
    HttpModule.registerAsync({
      useFactory: () => ({
        maxRedirects: 5,
      }),
    }),
    sterlingBankModule,
    DisbursementModule,
    smsModule,
    slackModule,
    PartnerModule,
    EventEmitterModule.forRoot(),
    DisbursementRequestModule,
    MiscModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
