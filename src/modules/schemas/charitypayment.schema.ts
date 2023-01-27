import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { DisbursementStatus } from '../disbursement/disbursement.enum';
import { Transaction } from './transactions.schema';

export type CharityPaymentDocument = Charity & Document;

@Schema({ timestamps: true })
export class Charity {
  _id: string;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  fullname: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'CharityOrganisation' })
  charity: string;

  @Prop({ type: String, default: DisbursementStatus.initiated })
  status: string;

  @Prop({ type: Number, default: 0 })
  amount: number;

  @Prop({ type: String, default: '' })
  organisation: string;

  @Prop({ type: String, default: '' })
  organisationID: string;

  @Prop({
    types: [{ type: mongoose.Types.ObjectId, ref: 'Transaction' }],
  })
  transactions: Transaction[];

  @Prop({ type: Boolean, default: false })
  paid: boolean;

  @Prop({ type: String })
  aggregatorName: string;

  @Prop({ type: String })
  aggregatorId: string;

  @Prop({ type: String })
  aggregatorOrganisation: string;

  @Prop({ type: String })
  scheduleId: string;

  @Prop({ type: Number, default: 0 })
  quantityOfWaste: number;

  @Prop({ type: String })
  cardID: string;

  @Prop({ type: String, default: 'Lagos' })
  state: string;
}

export const CharityPaymentSchema = SchemaFactory.createForClass(Charity);
