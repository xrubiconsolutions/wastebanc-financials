import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type CharityOrganisationDocument = CharityOrganisation & Document;

@Schema({ timestamps: true })
export class CharityOrganisation {
  _id: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  bank: string;

  @Prop({ type: String })
  accountNumber: string;
}

export const CharityOrganisationSchema =
  SchemaFactory.createForClass(CharityOrganisation);
