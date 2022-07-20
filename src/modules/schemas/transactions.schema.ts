import { Schema, SchemaFactory } from '@nestjs/mongoose';

export type TransactionDocument = Transaction & Document;
@Schema({ timestamps: true })
export class Transaction {
  _id: string;
}

export const transactionSchema = SchemaFactory.createForClass(Transaction);
