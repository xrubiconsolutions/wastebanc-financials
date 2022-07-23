import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: string;
  @Prop({ type: String, unique: true })
  phone: string;
  @Prop({ type: String })
  username: string;
  @Prop({ type: String, default: 'First' })
  firstname: string;
  @Prop({ type: String, default: 'Last' })
  lastname: string;
  @Prop({ type: String, default: 'Other_names' })
  othernames: string;
  @Prop({ type: String, default: 'Lagos' })
  address: string;
  @Prop({ type: String })
  fullname: string;
  @Prop({ type: String, unique: true })
  email: string;
  @Prop({ type: String })
  password: string;
  @Prop({ type: Date, default: new Date() })
  createAt: Date;
  @Prop({ type: String, default: '' })
  role: string;
  @Prop({ type: String, default: '' })
  displayRole: string;
  @Prop({ type: String, default: 'client' })
  roles: string;
  @Prop({ type: String, default: '+234' })
  countryCode: string;
  @Prop({ type: Boolean, default: false })
  verified: boolean;
  @Prop({ type: Number, default: 1 })
  userType: number;
  @Prop({ type: Number, default: 0 })
  availablePoints: number;
  @Prop({ type: Number, default: 0 })
  rafflePoints: number;
  @Prop({ type: Number, default: 0 })
  schedulePoints: number;
  @Prop({ type: String })
  gender: string;
  @Prop({ type: String })
  lcd: string;
  @Prop({ type: String })
  dateOfBirth: string;
  @Prop({ type: String })
  onesignal_id: string;
  @Prop({ type: String })
  last_logged_in: string;
  @Prop({ type: String })
  mobile_carrier: string;
  @Prop({ type: String })
  phone_OS: string;
  @Prop({ type: Date, defaule: Date.now() + 365 * 24 * 60 * 60 * 1000 })
  expiry_license: Date;
  @Prop({ type: String })
  profile_picture: string;
  @Prop({ type: String })
  internet_provider: string;
  @Prop({ type: String })
  country: string;
  @Prop({ type: String })
  states: string;
  @Prop({ type: String, default: 'active' })
  status: string;
  @Prop({ type: String })
  resetToken: string;
  @Prop({ type: Date })
  resetTimeOut: Date;
  @Prop({ type: Number })
  uType: number;
  @Prop({ type: String })
  organisationType: string;
  @Prop({ type: String, default: 'All' })
  locationScope: string;
  @Prop({ type: Boolean, default: true })
  firstLogin: boolean;
  @Prop({ type: Boolean, default: true })
  terms_condition: boolean;
  @Prop({ type: String })
  accountNo: string;
  @Prop({ type: String })
  cifNo: string;
  @Prop({ type: Number })
  percentageAcc: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
