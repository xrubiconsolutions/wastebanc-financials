export interface ussdResult {
  statusCode: string;
  data: {
    inboundResponse: string;
    userInputRequired: boolean;
    serviceCode: string;
    messageType: number;
    msisdn: string;
    sessionId: string;
  };
  statusMessage: string;
  link: {
    self: [];
  };
}

export interface ussdValues {
  msisdn: string;
  sessionId: string;
  messageType: number;
  imsi: string;
  ussdString: string;
  cellId: any;
  language: any;
  serviceCode: string;
}
