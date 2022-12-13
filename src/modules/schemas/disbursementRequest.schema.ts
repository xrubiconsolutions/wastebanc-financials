import { Collector } from './collector.schema';
import { Transaction } from './transactions.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { DisbursementStatus } from '../disbursement/disbursement.enum';

export type DisbursementRequestDocument = DisbursementRequest & Document;

@Schema({ timestamps: true })
export class DisbursementRequest {
  _id: string;

  @Prop({ type: String })
  userType: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Collector' })
  collector: Collector;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: String })
  currency: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ type: Number, default: 0 })
  charge: number;

  @Prop({ type: Number })
  withdrawalAmount: number;

  @Prop({ type: String })
  withdrawalAmountStr: string;

  @Prop({ type: String })
  type: string;

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

  @Prop({ type: String, default: DisbursementStatus.initiated })
  status: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'CharityOrganisation' })
  charity: string;

  @Prop({ type: String })
  reference: string;

  @Prop({ type: Date })
  otpExpiry: Date;

  @Prop({ type: String })
  principalIdentifier: string;

  @Prop({ type: String })
  referenceCode: string;

  @Prop({ type: String })
  paymentReference: string;

  @Prop({ type: String })
  transactionType: string;

  @Prop({
    types: [{ type: mongoose.Types.ObjectId, ref: 'Transaction' }],
  })
  transactions: [];

  @Prop({ type: Number })
  weight: number;

  @Prop({ type: Number })
  coin: number;
}

export const DisbusmentRequestSchema =
  SchemaFactory.createForClass(DisbursementRequest);
