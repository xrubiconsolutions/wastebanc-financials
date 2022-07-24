import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class disbursementRequestDTO {
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
  @IsString()
  bankName: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  charge: number;

  @IsNotEmpty()
  @IsString()
  beneName: string;

  @IsOptional()
  nesidNumber: string;

  @IsOptional()
  nerspNumber: string;

  @IsOptional()
  kycLevel: string;

  @IsOptional()
  bvn: string;

  @IsNotEmpty()
  @IsString()
  currency: string;
}

export class requestChargesDTO {
  @IsNotEmpty()
  @IsString()
  bankCode: string;
}
