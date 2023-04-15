import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type failedPaymentRequestDocument = failedPaymentRequest & Document;

@Schema({ timestamps: true })
export class failedPaymentRequest {
  _id: string;

  @Prop({ type: String })
  partnerName: string;

  @Prop({ type: Object })
  partnerResponse: any;
}

export const failedPaymentRequestSchema =
  SchemaFactory.createForClass(failedPaymentRequest);
