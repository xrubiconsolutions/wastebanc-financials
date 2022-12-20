import { ResponseHandler } from './../../utils/misc';
import { Injectable, Logger, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
// import { ussdResult } from './ussd.dto';

@Injectable()
export class ussdService {
  //constructor() {}

  async initate(@Req() req: Request) {
    const { body } = req;
    console.log(body);
    try {
      const inboundResponse = {
        'Service Provider Menu': 'Welcome to Pakam USSD',
        '1.': 'Register',
        '2.': 'Schedule Pick-up',
        '3.': 'Schedule Drop-off',
        '4.': 'Wallet balance',
        '5.': 'Schedule history',
        '6.': 'Missed Schedule',
        '7.': 'Transfer from wallet into account',
      };
      return {
        statusCode: '0000',
        data: {
          inboundResponse,
          userInputRequired: true,
        },
        statusMessage: 'Success.',
      };
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }
}
