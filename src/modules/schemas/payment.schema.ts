import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type PayDocument = Pay & Document;

@Schema({ timestamps: true })
export class Pay {
  _id: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'Transaction' })
  transaction: string;

  @Prop({ type: String })
  fullname: string;

  @Prop({ type: String })
  userPhone: string;

  @Prop({ type: String })
  bankAcNo: string;

  @Prop({ type: String })
  bankName: string;

  @Prop({ type: String })
  organisation: string;

  @Prop({ type: String })
  organistionID: string;

  @Prop({ type: Boolean, default: false })
  paid: boolean;

  @Prop({ type: String })
  aggregatorId;

  @Prop({ type: String })
  aggregatorName: string;

  @Prop({ type: String })
  aggregatorOrganisation: string;

  @Prop({ type: String })
  scheduleId: string;

  @Prop({ type: Number })
  quantityOfWaste: number;

  @Prop({ type: String })
  cardID: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String, default: 'Lagos' })
  status: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'DisbursementRequest' })
  request: string;

  @Prop({ type: String })
  reference: string;
}

export const PaySchema = SchemaFactory.createForClass(Pay);
