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

  @Prop({ type: String })
  messageType: string;

  @Prop({ type: String })
  ussdString: string;

  @Prop({ type: String, default: null })
  lastMenuVisted: string;

  @Prop({ type: String, default: null })
  sessionState: string;

  @Prop({ type: Object, default: null })
  response: any;
}

export const UssdSessionSchema = SchemaFactory.createForClass(UssdSession);
