import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

export type DisbursementRequestDocument = DisbursementRequest & Document;

@Schema({ timestamps: true })
export class DisbursementRequest {
  _id: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: String })
  currency: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: Number, default: 0 })
  charge: number;

  @Prop({ type: String })
  bankCode: string;

  @Prop()
  beneName: string;

  @Prop()
  destinationAccount: string;

  @Prop()
  bankName: string;

  @Prop()
  destinationBankCode: string;

  @Prop()
  nesidNumber: string;

  @Prop()
  nerspNumber: string;

  @Prop()
  kycLevel: string;

  @Prop()
  bvn: string;

  @Prop({ type: Date })
  expiryTime: Date;
}

export const DisbusmentRequestSchema =
  SchemaFactory.createForClass(DisbursementRequest);
