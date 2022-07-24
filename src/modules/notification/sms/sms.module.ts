import { smsController } from './sms.controller';
import { smsService } from './sms.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [HttpModule],
  providers: [smsService],
  exports: [smsService],
  controllers: [smsController],
})
export class smsModule {}
