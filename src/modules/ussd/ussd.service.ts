import { UserDocument } from './../schemas/user.schema';
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
  private menu_for_msisdn_NotReg: string;
  private menu_for_msisdn_reg: string;
  private nextMenu: string;
  private params: ussdValues;
  private session: UssdSession | null;
  private user: User | null;
  constructor(
    @InjectModel(UssdSession.name)
    private ussdSessionModel: Model<UssdSessionDocument>,
    @InjectModel(UssdSessionLog.name)
    private ussdSessionLogModel: Model<UssdSessionLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
    this.menu_for_msisdn_NotReg =
      'Welcome to Pakam:' +
      '\n1. Register' +
      '\n2. Schedule Pick up' +
      '\n3. Schedule Drop off' +
      '\n4. Wallet Balance' +
      '\n5. Withdraw From Wallet' +
      '\n00. Quit';

    this.menu_for_msisdn_reg =
      'Welcome to Pakam:' +
      '\n1. Schedule Pick up' +
      '\n2. Schedule Drop off' +
      '\n3. Wallet Balance' +
      '\n4. Withdraw From Wallet' +
      '\n00. Quit';
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
      await this.getUser();

      if (params.messageType.toString() == '0') {
        //this starts a new session for the msisdn
        if (this.user == null) {
          this.result.data.inboundResponse = this.menu_for_msisdn_NotReg;
        } else {
          this.result.data.inboundResponse = this.menu_for_msisdn_reg;
        }

        await this.closeSession();
        await this.openSession();
        return this.result;
      }

      if (params.messageType.toString() == '2') {
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

  private async getUser() {
    const phone = this.params.msisdn.slice(3);
    console.log(phone);
    const user = await this.userModel.findOne({
      phone,
    });
    if (!user) {
      return (this.user = null);
    }
    return (this.user = user);
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

    if (ussdString == '00') {
      await this.closeSession();
    }
    if (this.session.sessionState == null && ussdString == '1') {
      // check if phone already registered on pakam
      // if already registered then 1 == schedule pickup
      // else 1 == register
      // handle register for ussd user const user = await this.userModel.findOne({ phone: this.params.msisdn });
      if (this.user) {
        // schedule pickup is the menu select
        // await this.schedulePickUp();
      } else {
        await this.registerUser();
      }
    }

    if (this.session.sessionState == 'user_registration') {
      await this.registerUser();
    }

    if (this.session.sessionState == 'continue') {
      // return a menu without registration
      this.result.data.inboundResponse = this.menu_for_msisdn_reg;
    }
    return this.session;
  }

  async closeSession(): Promise<void> {
    await this.ussdSessionModel.deleteMany({
      msisdn: this.params.msisdn,
    });
  }

  private async registerUser() {
    if (this.session.lastMenuVisted == null) {
      // call payment service here
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

    if (
      this.session.lastMenuVisted != null &&
      this.session.lastMenuVisted == 'Select Gender'
    ) {
      console.log('response b4', this.session.response);
      this.session.response.country = 'Nigeria';
      this.session.response.state = 'Lagos';
      const nextMenu = 'Please Enter an address';
      this.result.data.inboundResponse = nextMenu;
      if (this.params.ussdString == '1') {
        this.session.response.gender = 'male';
      }
      if (this.params.ussdString == '2') {
        this.session.response.gender = 'female';
      }
      console.log('response b4 update', this.session.response);
      await this.updateSession(
        'Please Enter an address',
        'user_registration',
        this.session.response,
      );
      return this.result;
    }

    if (
      this.session.lastMenuVisted != null &&
      this.session.lastMenuVisted == 'Please Enter an address'
    ) {
      const nextMenu = 'Set a PIN';
      this.session.response.address = this.params.ussdString;
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession(
        'Set a PIN',
        'user_registration',
        this.session.response,
      );
      return this.result;
    }

    if (
      this.session.lastMenuVisted != null &&
      this.session.lastMenuVisted == 'Set a PIN'
    ) {
      // create an account for user
      const nextMenu =
        'Pakam Account created successfully:' + '\n1.Continue' + '\n00. Quit';
      this.result.data.inboundResponse = nextMenu;
      const newUser = await this.userModel.create({
        phone: this.params.msisdn.slice(3),
        username: this.session.response.username,
        fullname: this.session.response.fullname,
        address: this.session.response.address,
        email: `${this.session.response.fullname.trim()}@gmail.com`,
        verified: true,
        country: 'Nigeria',
        state: 'Lagos',
        gender: this.session.response.gender,
        createAt: Date.now(),
        transactionPin: this.params.ussdString,
      });
      await this.userModel.updateOne(
        { _id: newUser._id },
        {
          $set: {
            cardID: newUser._id.toString(),
          },
        },
      );

      await this.updateSession(null, 'continue', null);
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
    await this.ussdSessionLogModel.create({
      msisdn: this.params.msisdn,
      sessionId: this.params.sessionId,
      imsi: this.params.imsi,
      messageType: this.params.messageType,
      ussdString: this.params.ussdString,
      response,
      lastMenuVisted: menu,
    });
  }
}
