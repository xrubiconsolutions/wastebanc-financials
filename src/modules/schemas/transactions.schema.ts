import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  _id: string;

  @Prop({ type: Number, default: 0 })
  weight: number;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: String })
  address: string;

  @Prop({ type: String })
  fullname: string;

  @Prop({ type: Number, default: 0 })
  coin: number;

  @Prop({ type: Number, default: 0 })
  wastePickerCoint: number;

  @Prop({ type: String })
  type: string;

  @Prop({ type: String })
  scheduleId: string;

  @Prop({ type: String })
  cardID: string;

  @Prop({ type: String })
  completedBy: string;

  @Prop({ type: Boolean, default: false })
  paid: boolean;

  @Prop({ type: Boolean, default: false })
  requestedForPayment: boolean;

  @Prop({ type: String })
  Category;

  @Prop({ type: Array, default: [] })
  categories: string[];

  @Prop({ type: String })
  organisationID: string;

  @Prop({ type: String })
  recycler: string;

  @Prop({ type: String, enum: ['charity', 'gain'], default: 'gain' })
  paymentResolution: string;

  @Prop({ type: String })
  aggregatorId: string;

  @Prop({ type: String })
  organisation: string;

  @Prop({ type: String })
  state: string;

  @Prop({ type: Boolean, default: false })
  organisationPaid: boolean;

  @Prop({ type: Number, default: 0 })
  percentage: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
