import { PartnerModule } from './../partners/partner.module';
import { slackModule } from './../notification/slack/slack.module';
import { userService } from './users.service';
import { User, UserSchema } from './../schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { usersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    slackModule,
    PartnerModule,
  ],
  providers: [userService],
  controllers: [usersController],
})
export class usersModule {}
