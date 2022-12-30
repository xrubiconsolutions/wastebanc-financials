import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type CategoriesDocument = Categories & Document;
@Schema({ timestamps: true })
export class Categories {
  _id: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  value: string;

  @Prop({ type: Number, default: 0 })
  wastepicker: number;
}

export const CategoriesSchema = SchemaFactory.createForClass(Categories);
