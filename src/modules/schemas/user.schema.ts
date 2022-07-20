import { Schema, SchemaFactory } from '@nestjs/mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
