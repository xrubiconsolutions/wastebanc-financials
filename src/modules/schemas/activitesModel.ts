import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type userActivitiesDocument = userActivities & Document;
@Schema({ timestamps: true })
export class userActivities {
  _id: string;

  @Prop({ type: String, default: 'client' })
  userType: string;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: String })
  activity_type: string;
}

export const userActivitiesSchema =
  SchemaFactory.createForClass(userActivities);
