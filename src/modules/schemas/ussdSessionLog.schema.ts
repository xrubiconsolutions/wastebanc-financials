import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UssdSessionLogDocument = UssdSessionLog & Document;
@Schema({ timestamps: true })
export class UssdSessionLog {
  _id: string;

  @Prop({ type: String })
  msisdn: string;

  @Prop({ type: String })
  sessionId: string;

  @Prop({ type: String })
  imsi: string;

  @Prop({ type: Number })
  messageType: number;

  @Prop({ type: String })
  ussdString: string;

  @Prop({ type: String })
  lastMenuVisted: string;
}

export const UssdSessionLogSchema =
  SchemaFactory.createForClass(UssdSessionLog);
