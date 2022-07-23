import { partnerService } from './partnersService';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [partnerService],
  controllers: [],
  exports: [partnerService],
})
export class PartnerModule {}
