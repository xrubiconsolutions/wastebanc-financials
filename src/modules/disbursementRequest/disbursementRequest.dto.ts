import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class disbursementDTO {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  destinationAccount: string;

  @IsNotEmpty()
  @IsString()
  destinationBankCode: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  beneName: string;

  @IsOptional()
  nesidNumber: string;

  @IsOptional()
  nerspNumber: string;

  @IsOptional()
  kycLevel: string;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
