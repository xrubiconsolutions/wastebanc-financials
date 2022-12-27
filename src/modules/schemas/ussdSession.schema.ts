import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UssdSessionDocument = UssdSession & Document;
@Schema({ timestamps: true })
export class UssdSession {
  _id: string;

  @Prop({ type: String, unique: true })
  msisdn: string;

  @Prop({ type: String, unique: true })
  sessionId: string;

  @Prop({ type: String, unique: true })
  imsi: string;

  @Prop({ type: Number })
  messageType: number;

  @Prop({ type: String })
  ussdString: string;

  @Prop({ type: String })
  lastMenuVisted: string;
}

export const UssdSessionSchema = SchemaFactory.createForClass(UssdSession);
