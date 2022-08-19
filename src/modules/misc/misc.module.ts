import { Partner, PartnerSchema } from './../schemas/partner.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { MiscController } from './misc.controller';
import { MiscService } from './misc.service';
import { Module } from '@nestjs/common';
import { PartnerModule } from '../partners/partner.module';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Partner.name, schema: PartnerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PartnerModule,
  ],
  providers: [MiscService],
  controllers: [MiscController],
  exports: [MiscService],
})
export class MiscModule {}
