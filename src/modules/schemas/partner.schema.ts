import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

export type PartnerDocument = Partner & Document;

@Schema({ timestamps: true })
export class Partner {
  _id: string;
  @Prop({ type: String })
  name: string;
  @Prop({ type: String })
  sortCode: string;
  @Prop({ type: String })
  charges: string;
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
