import { ussdController } from './ussd.controller';
import { ussdService } from './ussd.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [ussdService],
  controllers: [ussdController],
})
export class ussdModule {}
