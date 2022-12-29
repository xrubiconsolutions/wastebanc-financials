export interface ussdResult {
  statusCode: string;
  data: {
    inboundResponse: string;
    userInputRequired: boolean;
    serviceCode: string;
    messageType: string;
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
  messageType: string;
  imsi: string;
  ussdString: string;
  cellId: any;
  language: any;
  serviceCode: string;
}
