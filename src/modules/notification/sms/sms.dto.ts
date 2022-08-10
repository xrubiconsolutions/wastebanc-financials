export class OtpDTO {
  phone: string;
  token?: string;
}

export class smsDTO extends OtpDTO {
  message?: string;
  organisationName: string;
  userName: string;
}
