export class OtpDTO {
  phone: string;
}

export class smsDTO extends OtpDTO {
  message?: string;
  organisationName: string;
  userName: string;
}
