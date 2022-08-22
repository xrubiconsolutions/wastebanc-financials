import { CollectorStatus } from './../pickupSchedules/schedule.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CompletionStatus } from '../pickupSchedules/schedule.enum';

export type schedulesDocument = schedules & Document;

@Schema({ timestamps: true, collection: 'schedulepicks' })
export class schedules {
  _id: string;

  @Prop({ type: String })
  client: string;

  @Prop({ type: String })
  clientId: string;

  @Prop({ type: String })
  scheduleCreator: string;

  @Prop({ type: String })
  phone: string;

  @Prop({ type: String })
  Category: string;

  @Prop({ type: Array, default: [] })
  categories: string[];

  @Prop({ type: Number, default: 0 })
  quantiy: number;

  @Prop({ type: String })
  details: string;

  @Prop({ type: String })
  address: string;

  @Prop({ type: Date })
  pickUpDate: Date;

  @Prop({ type: Date })
  expiryDuration: Date;

  @Prop({ type: Boolean })
  reminder: boolean;

  @Prop({ type: Date, default: null })
  reminderDate: Date;

  @Prop({ type: Boolean })
  callOnArrival: boolean;

  @Prop({ type: String, default: CompletionStatus.pending })
  completionStatus: string;

  @Prop({ type: String })
  organisation: string;

  @Prop({ type: String })
  cancelReason: string;

  @Prop({ type: String, default: CollectorStatus.decline })
  collectorStatus: string;

  @Prop({ type: Boolean, default: false })
  acceptedBy: boolean;

  @Prop({ type: String })
  collectedBy: string;

  @Prop({ type: String })
  collectedPhone: string;

  @Prop({ type: Number })
  rating: number;

  @Prop({ type: String })
  comment: string;

  @Prop({ type: String })
  organisationCollection: string;

  @Prop({ type: String })
  lcd: string;

  @Prop({ type: Number })
  lat: number;

  @Prop({ type: Number })
  long: number;

  @Prop({ type: String })
  recycler: string;

  @Prop({ type: Date })
  completionDate: Date;

  @Prop({ type: String })
  state: string;
}

export const schedulesSchema = SchemaFactory.createForClass(schedules);
