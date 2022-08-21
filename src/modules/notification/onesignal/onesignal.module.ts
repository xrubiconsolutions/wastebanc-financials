import { onesignalService } from './onesignal.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [onesignalService],
  exports: [onesignalService],
})
export class onesignalModule {}
