import { IsNotEmpty, IsString } from 'class-validator';

export class resolveAccountDTO {
  @IsNotEmpty({ message: 'accountNumber is required' })
  @IsString()
  accountNumber: string;
  @IsNotEmpty({ message: 'bankCode is required' })
  @IsString()
  BankCode: string;

  referenceId: string;
  userId: string;
}
