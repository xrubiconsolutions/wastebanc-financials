import { MiscController } from './misc.controller';
import { MiscService } from './misc.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [MiscService],
  controllers: [MiscController],
  exports: [MiscService],
})
export class MiscModule {}
