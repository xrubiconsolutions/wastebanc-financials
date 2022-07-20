import { SterlingController } from './sterlingBank.controller';
import { sterlingBankService } from './sterlingBank.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [sterlingBankService],
  controllers: [SterlingController],
})
export class sterlingBankModule {}
