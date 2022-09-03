import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type CollectorPayDocument = CollectorPay & Document;

@Schema({ timestamps: true })
export class CollectorPay {
  _id: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'Collector' })
  collector: string;

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
  organistionID: string;

  @Prop({ type: Boolean, default: false })
  paid: boolean;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'Organisation' })
  organisation: string;

  @Prop({ type: String })
  scheduleId: string;

  @Prop({ type: Number })
  quantityOfWaste: number;

  @Prop({ type: String })
  cardID: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: String, default: 'Lagos' })
  state: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'DisbursementRequest' })
  request: string;

  @Prop({ type: String })
  reference: string;
}

export const CollectorPaySchema = SchemaFactory.createForClass(CollectorPay);
