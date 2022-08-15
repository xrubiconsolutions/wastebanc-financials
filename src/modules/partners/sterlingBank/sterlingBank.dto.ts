import { Optional } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class valueDTO {
  value: string;
}

export class nipInquiryDTO {
  @IsNotEmpty({ message: 'accountNumber is required' })
  @IsString()
  accountNumber: string;
  @IsNotEmpty({ message: 'bankCode is required' })
  @IsString()
  BankCode: string;

  referenceId: string;
}

export class accountNumberDTO {
  accountNumber: string;
}

export class GenerateVirtualAccountDTO {
  @IsNotEmpty({ message: 'BVN is required' })
  @IsString()
  BVN: string;
  @IsNotEmpty({ message: 'NIN is required' })
  @IsString()
  NIN: string;
  @IsNotEmpty({ message: 'PhoneNumber is required' })
  @IsString()
  PhoneNumber: string;
}

export class nipTransferDTO {
  @IsNotEmpty({ message: 'fromAccount is required' })
  @IsString()
  fromAccount: string;

  @IsNotEmpty({ message: 'toAccount is required' })
  @IsString()
  toAccount: string;

  @IsNotEmpty({ message: 'amount is required' })
  @IsString()
  amount: string;

  @Optional()
  principalIdentifier: string;

  @IsNotEmpty({ message: 'referenceCode is required' })
  @IsString()
  referenceCode: string;

  @IsNotEmpty({ message: 'beneficiaryName is required' })
  @IsString()
  beneficiaryName: string;

  @Optional()
  paymentReference: string;

  @IsNotEmpty({ message: 'customerShowName is required' })
  @IsString()
  customerShowName: string;

  @IsNotEmpty({ message: 'channelCode is required' })
  @IsString()
  channelCode: string;

  @IsNotEmpty({ message: 'destinationBankCode is required' })
  @IsString()
  destinationBankCode: string;

  @Optional()
  nesid: string;

  @Optional()
  nersp: string;

  @Optional()
  beneBVN: string;

  @Optional()
  beneKycLevel: string;

  @Optional()
  requestId: string;
}

export class intraBankDTO {
  @IsNotEmpty({ message: 'fromAccount is required' })
  @IsString()
  fromAccount: string;

  @IsNotEmpty({ message: 'ToAccount is required' })
  @IsString()
  ToAccount: string;

  @IsNotEmpty()
  @IsString()
  TransactionType: string;

  @IsNotEmpty()
  @IsString()
  CurrencyCode: string;

  @IsNotEmpty()
  @IsString()
  PaymentReference: string;

  @IsNotEmpty()
  @IsString()
  NarrationLine1: string;

  @IsOptional()
  NarrationLine2: string;

  @IsNotEmpty()
  @IsString()
  BeneficiaryName: string;

  @IsNotEmpty()
  @IsString()
  SenderName: string;
}

export class verifyTransactionDTO {
  requestId: string;
  transactionType: string;
}
