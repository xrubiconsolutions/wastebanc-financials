import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
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
import { User } from '../schemas/user.schema';

// import { ussdResult } from './ussd.dto';

@Injectable()
export class ussdService {
  public result: ussdResult;
  private LEVEL_0_TEXT: string;
  private nextMenu: string;
  private params: ussdValues;
  private session: UssdSession | null;
  private user: User | null;
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
        messageType: '0',
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
      '\n5. Withdraw From Wallet' +
      '\n6. Quit';
    this.params = null;
    this.session = null;
    this.user = null;
    this.nextMenu = '';
  }

  async initate(params: ussdValues) {
    try {
      this.result.data.serviceCode = params.serviceCode;
      this.result.data.msisdn = params.msisdn;
      this.result.data.messageType = params.messageType;
      this.result.data.sessionId = params.sessionId;
      this.params = params;

      if (params.messageType == '0') {
        //this starts a new session for the msisdn
        this.result.data.inboundResponse = this.LEVEL_0_TEXT;
        await this.closeSession();
        await this.openSession();
        return this.result;
      }

      if (params.messageType == '2') {
        //close session
        await this.closeSession();
        return this.result;
      }
      //get the session
      await this.getSession();
      await this.processLevel();
      return this.result;
    } catch (error) {
      console.log(error);
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }

  async openSession(): Promise<void> {
    await this.ussdSessionModel.create({
      msisdn: this.params.msisdn,
      sessionId: this.params.sessionId,
      imsi: this.params.imsi,
      messageType: this.params.messageType,
      ussdString: this.params.ussdString,
      response: null,
      lastMenuVisted: null,
    });

    await this.ussdSessionLogModel.create({
      msisdn: this.params.msisdn,
      sessionId: this.params.sessionId,
      imsi: this.params.imsi,
      messageType: this.params.messageType,
      ussdString: this.params.ussdString,
      response: null,
      lastMenuVisted: null,
    });
  }

  async getSession() {
    const session = await this.ussdSessionModel.findOne({
      sessionId: this.params.sessionId,
    });
    if (!session) {
      throw new UnprocessableEntityError({
        message: 'Session has not started',
        verboseMessage: 'Session has not started',
      });
    }

    this.session = session;
  }

  async processLevel() {
    /*continue
     * get the response from the params(ussdString)
     * get the last menu picked
     * used the last and response to handle the next event or show another menu
     */
    const ussdString = this.params.ussdString;
    if (this.session.sessionState == null && ussdString == '1') {
      // handle register for ussd user
      await this.registerUser();
    }

    if ((this.session.sessionState = 'user_registration')) {
      await this.registerUser();
    }

    return this.session;
    // if (
    //   !this.session.lastMenuVisted &&
    //   this.session.lastMenuVisted == 'Enter fullname'
    // ) {
    //   // store the fullname in the session store
    // }

    // if (
    //   !this.session.lastMenuVisted &&
    //   this.session.lastMenuVisted == 'Enter Gender'
    // ) {
    // }

    // if (
    //   !this.session.lastMenuVisted &&
    //   this.session.lastMenuVisted == 'Enter Pickup address'
    // ) {
    // }

    // if (
    //   !this.session.lastMenuVisted &&
    //   this.session.lastMenuVisted == 'Enter Password'
    // ) {
    // }
  }

  async closeSession(): Promise<void> {
    await this.ussdSessionModel.deleteMany({
      msisdn: this.params.msisdn,
    });
  }

  private async registerUser() {
    if (this.session.lastMenuVisted == null) {
      const nextMenu = 'Enter Fullname';
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession(nextMenu, 'user_registration', null);
      return this.result;
    }

    if (
      this.session.lastMenuVisted != null &&
      this.session.lastMenuVisted == 'Enter Fullname'
    ) {
      const nextMenu = 'Select Gender:' + '\n1.Male' + '\n2.Female';
      const response = {
        fullname: this.params.ussdString,
        username: this.params.ussdString,
      };
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession('Select Gender', 'user_registration', response);
      return this.result;
    }
    return this.result;
  }

  // private async schedulePickUp() {}

  // private async scheduleDropOff() {}

  // private async getWalletbalance() {}

  // private async withdrawBalance() {}

  private async updateSession(
    menu: string,
    sessionState: string,
    response: any,
  ): Promise<void> {
    await this.ussdSessionModel.updateOne(
      { sessionId: this.params.sessionId, msisdn: this.params.msisdn },
      {
        lastMenuVisted: menu,
        messageType: this.params.messageType,
        ussdString: this.params.ussdString,
        sessionState,
        response,
      },
    );
  }
}
