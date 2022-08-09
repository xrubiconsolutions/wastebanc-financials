import { IsNotEmpty, IsString } from 'class-validator';
export class InitiateDTO {
  // @IsNotEmpty()
  // @IsString()
  userId: string;

  // @IsNotEmpty()
  // @IsString()
  requestId: string;

  // @IsNotEmpty()
  // @IsString()
  otp: string;
}
