import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { DisbursementStatus } from '../disbursement/disbursement.enum';

export type CharityPaymentDocument = Charity & Document;

@Schema({ timestamps: true })
export class Charity {
  _id: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'CharityOrganisation' })
  charity: string;

  @Prop({ type: String, default: DisbursementStatus.initiated })
  status: string;

  @Prop({ type: Number, default: 0 })
  amount: string;

  @Prop({ type: String })
  organisation: string;

  @Prop({ type: String })
  organisationID: string;

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

  @Prop({ type: String })
  quantityOfWaste: string;

  @Prop({ type: String })
  cardID: string;

  @Prop({ type: String })
  state: string;
}

export const CharityPaymentSchema = SchemaFactory.createForClass(Charity);
