import { UssdSessionLog } from './../schemas/ussdSessionLog.schema';
import {
  UssdSession,
  UssdSessionDocument,
} from './../schemas/ussdSession.schema';
import { ResponseHandler } from './../../utils/misc';
import { Injectable, Logger } from '@nestjs/common';
import { ussdResult, ussdValues } from './ussd.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UssdSessionLogDocument } from '../schemas/ussdSessionLog.schema';

// import { ussdResult } from './ussd.dto';

@Injectable()
export class ussdService {
  public result: ussdResult;
  private LEVEL_0_TEXT: string;
  constructor(
    @InjectModel(UssdSession.name)
    private ussdSessionModel: Model<UssdSessionDocument>,
    @InjectModel(UssdSessionLog.name)
    private ussdSessionLogModel: Model<UssdSessionLogDocument>,
  ) {
    this.result = {
      statusCode: '0000',
      data: {
        inboundResponse: '',
        userInputRequired: true,
        serviceCode: '',
        messageType: 0,
        msisdn: '',
        sessionId: '',
      },
      statusMessage: 'Success.',
      link: {
        self: [],
      },
    };
    this.LEVEL_0_TEXT =
      'Welcome to Pakam:' +
      '\n1.Register' +
      '\n2. Schedule Pick-up' +
      '\n3. Schedule Drop-off' +
      '\n4. Wallet Balance' +
      '\n5. Withdraw From Wallet';
  }

  async initate(params: ussdValues) {
    try {
      this.result.data.serviceCode = params.serviceCode;
      this.result.data.msisdn = params.msisdn;
      this.result.data.messageType = params.messageType;
      this.result.data.sessionId = params.sessionId;
      if (params.messageType == 0) {
        this.result.data.inboundResponse = this.LEVEL_0_TEXT;
      }
      return this.result;
    } catch (error) {
      console.log(error);
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }
}
