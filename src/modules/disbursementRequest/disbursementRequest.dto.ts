import { IsOptional } from 'class-validator';

export class disbursementRequestDTO {
  userId: string;

  destinationAccount: string;

  destinationBankCode: string;

  bankName: string;

  amount: number;

  @IsOptional()
  charge: number;

  type: string;

  beneName: string;

  @IsOptional()
  nesidNumber: string;

  @IsOptional()
  nerspNumber: string;

  @IsOptional()
  kycLevel: string;

  @IsOptional()
  bvn: string;

  currency: string;

  @IsOptional()
  reference: string;

  transactions: string[];
}

export class requestChargesDTO {
  bankCode: string;
  userId: string;
}

export class wastepickerdisursmentDTO {
  collectorId: string;
  type: string;
}
