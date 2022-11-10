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

export class initiateWastePickerWithdrawalDTO {
  collectorId: string;
  requestId: string;
  otp: string;
}

export class InitiateSAFDTO {
  userId: string;
  otp: string;
}
