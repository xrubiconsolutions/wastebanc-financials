import { Transaction } from './transactions.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User } from './user.schema';

export type DisbursementRequestDocument = DisbursementRequest & Document;

@Schema({ timestamps: true })
export class DisbursementRequest {
  _id: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: String })
  currency: string;

  @Prop({ type: String })
  bankCode: string;
  @Prop()
  transaction: Transaction;

  @Prop({ type: Date })
  expiryTime: Date;
}

export const DisbusmentRequestSchema =
  SchemaFactory.createForClass(DisbursementRequest);
