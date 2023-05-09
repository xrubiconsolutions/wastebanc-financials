import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type transactionActivitesDocument = transactionActivities & Document;

@Schema({ timestamps: true })
export class transactionActivities {
  _id: string;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  transactionType: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: String })
  amount: string;

  @Prop({ type: String })
  status: string;

  @Prop({ type: String })
  type: string;

  @Prop({ type: String })
  transaction: string;
}

export const transactionActivitiesSchema = SchemaFactory.createForClass(
  transactionActivities,
);
