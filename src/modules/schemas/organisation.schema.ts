import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type OrganisationDocument = Organisation & Document;

export interface category {
  name: string;
  price: number;
}
@Schema({ timestamps: true })
export class Organisation {
  _id: string;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, required: true })
  rcNo: string;

  @Prop({ type: String, required: true })
  companyTag: string;

  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: String, default: 'company' })
  roles: string;

  @Prop({ type: String, default: '' })
  role: string;

  @Prop({ type: Boolean, default: true })
  licence_active: boolean;

  @Prop({ type: Date, default: Date.now() + 365 * 24 * 60 * 60 * 1000 })
  expiry_date: Date;

  @Prop({ type: Number, default: 0 })
  totalAvailable: number;

  @Prop({ type: Number, default: 0 })
  totalSpent: number;

  @Prop({ type: Number, default: null })
  resetToken: number;

  @Prop({ type: String, required: true })
  location: string;

  @Prop({ type: Array, required: true })
  areaOfAccess: string[];

  @Prop({ type: Array, required: [] })
  streetOfAccess: string[];

  @Prop({ type: Array, default: [] })
  categories: category[];

  @Prop({ type: Number, default: 0 })
  canEquivalent: number;

  @Prop({ type: Number, default: 0 })
  cartonEquivalent: number;

  @Prop({ type: Number, default: 0 })
  petBottleEquivalent: number;

  @Prop({ type: Number, default: 0 })
  rubberEquivalent: number;

  @Prop({ type: Number, default: 0 })
  plasticEquivalent: number;

  @Prop({ type: Number, default: 0 })
  woodEquivalent: number;

  @Prop({ type: Number, default: 0 })
  glassEquivalent: number;

  @Prop({ type: Number, default: 0 })
  nylonEquivalent: number;

  @Prop({ type: Number, default: 0 })
  metalEquivalent: number;

  @Prop({ type: Number, default: 0 })
  eWasteEquivalent: number;

  @Prop({ type: Number, default: 0 })
  tyreEquivalent: number;

  @Prop({ type: Date, default: Date.now })
  createAt: Date;

  @Prop({ type: Number, default: 0 })
  wallet: number;

  @Prop({ type: String, default: 'Nigeria' })
  country: string;

  @Prop({ type: String, default: 'Lagos' })
  state: string;

  @Prop({ type: Boolean, default: false })
  isDisabled: boolean;

  @Prop({ type: Date })
  last_logged_in: Date;

  @Prop({ type: Boolean })
  firstLogin: boolean;

  @Prop({ type: Boolean })
  allowPickers: boolean;

  @Prop({ type: Number, default: 0 })
  totalCollected: number;
}

export const OrganisationSchema = SchemaFactory.createForClass(Organisation);
