import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type centralAccountDocument = centralAccount & Document;

@Schema()
export class centralAccount {
  _id: string;

  @Prop({ type: String })
  acnumber: string;

  @Prop({ type: String })
  balance: string;

  @Prop({ type: String })
  bank: string;

  @Prop({ type: String })
  name: string;
}

export const centralAccountSchema =
  SchemaFactory.createForClass(centralAccount);
