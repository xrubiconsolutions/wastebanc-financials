import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type collectorDocument = Collector & Document;

export interface accountDetails {
  accountName: string;
  accountNo: string;
  bankName: string;
  bankSortCode: string;
}
@Schema({ timestamps: true })
export class Collector {
  _id: string;

  @Prop({ type: String })
  fullname: string;

  @Prop({ type: String })
  address: string;

  @Prop({ type: String, unique: true })
  email: string;

  @Prop({ type: String, unique: true })
  phone: string;

  @Prop({ type: String, default: 'collector' })
  roles: string;

  @Prop({ type: String, default: 'collector' })
  collectorType: string;

  @Prop({ type: Boolean, default: false })
  busy: boolean;

  @Prop({ type: String })
  password: string;

  @Prop({ type: String })
  countryCode: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;

  @Prop({ type: String, default: 'active' })
  status: string;

  @Prop({ type: String })
  gender: string;

  @Prop({ type: String })
  dateOfBirth: string;

  @Prop({ type: String })
  organisation: string;

  @Prop({ type: String })
  organisationId: string;

  @Prop({ type: String })
  state: string;

  @Prop({ type: String })
  place: string;

  @Prop({ type: Boolean })
  companyVerified: boolean;

  @Prop({ type: String })
  aggregatorId: string;

  @Prop({ type: String })
  localGovernment: string;

  @Prop({ type: Array })
  areaOfAccess: string[];

  @Prop({ type: String, default: null })
  approvedBy: string;

  @Prop({ type: Number, default: 0 })
  totalCollected: number;

  @Prop({ type: Number, default: 0 })
  pointGained: number;

  @Prop({ type: Number, default: 0 })
  numberOfTripsCompleted: number;

  @Prop({ type: String })
  lat: string;

  @Prop({ type: String })
  long: string;

  @Prop({ type: String })
  onesignal_id: string;

  @Prop({ type: String })
  profile_picture: string;

  @Prop({ type: Object })
  account: accountDetails;

  @Prop({ type: Number, default: 0 })
  requestedAmount: 0;
}

export const CollectorSchema = SchemaFactory.createForClass(Collector);
