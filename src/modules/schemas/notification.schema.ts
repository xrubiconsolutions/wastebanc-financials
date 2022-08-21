import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type notificationDocument = notification & Document;

@Schema({ timestamps: true })
export class notification {
  _id: string;

  @Prop({ type: String })
  notification_type: string;

  @Prop({ type: String })
  recycler_id: string;

  @Prop({ type: String })
  schedulerId: string;

  @Prop({ type: Boolean })
  seenNotification: boolean;

  @Prop({ type: String })
  lcd: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: String })
  scheduleId: string;

  @Prop({ type: String })
  dropOffId: string;
}

export const notificationSchema = SchemaFactory.createForClass(notification);
