import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type localGovernmentDocument = localGovernment & Document;

@Schema({ timestamps: true })
export class localGovernment {
  _id: string;

  @Prop({ type: String })
  lcd: string;

  @Prop({ type: String })
  lga: string;

  @Prop({ type: String })
  slug: string;

  @Prop({ type: String })
  country: string;

  @Prop({ type: String })
  state: string;
}

export const localGovernmentSchema =
  SchemaFactory.createForClass(localGovernment);
