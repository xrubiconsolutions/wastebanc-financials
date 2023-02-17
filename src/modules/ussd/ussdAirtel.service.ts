import { lastValueFrom, Observable } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  Charity,
  CharityPaymentDocument,
} from './../schemas/charitypayment.schema';
import {
  DisbursementStatus,
  DisbursementType,
  ProcessingType,
} from './../disbursement/disbursement.enum';
import { PayDocument } from './../schemas/payment.schema';
import {
  Transaction,
  TransactionDocument,
} from './../schemas/transactions.schema';
import { MiscService } from './../misc/misc.service';
import {
  CharityOrganisation,
  CharityOrganisationDocument,
} from './../schemas/charityorganisation.schema';
import { smsService } from './../notification/sms/sms.service';
import {
  notification,
  notificationDocument,
} from './../schemas/notification.schema';
import { onesignalService } from './../notification/onesignal/onesignal.service';
import {
  Organisation,
  OrganisationDocument,
} from './../schemas/organisation.schema';
import { schedules, schedulesDocument } from './../schemas/schedule.schema';
import {
  localGovernment,
  localGovernmentDocument,
} from './../schemas/localgovernment.schema';
import { Categories, CategoriesDocument } from './../schemas/category.schema';
import { UserDocument } from './../schemas/user.schema';
import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { UssdSessionLog } from './../schemas/ussdSessionLog.schema';
import {
  UssdSession,
  UssdSessionDocument,
} from './../schemas/ussdSession.schema';
import { env, generateReference, ResponseHandler } from './../../utils/misc';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ussdResult, ussdValues } from './ussd.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UssdSessionLogDocument } from '../schemas/ussdSessionLog.schema';
import { User } from '../schemas/user.schema';
import banklist from '../misc/ngnbanklist.json';
import { Pay } from '../schemas/payment.schema';
import disbursementConfig from '../disbursement/disbursement.config.json';
import { partnerService } from '../partners/partnersService';
import { SlackService } from '../notification/slack/slack.service';
import { SlackCategories } from '../notification/slack/slack.enum';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from '../schemas/disbursementRequest.schema';
import { AxiosResponse } from 'axios';

// import { ussdResult } from './ussd.dto';

@Injectable()
export class ussdAirtelService {
  public result: ussdResult;
  private menu_for_msisdn_NotReg: string;
  private menu_for_msisdn_without_pin: string;
  private menu_for_msisdn_reg: string;
  private nextMenu: string;
  private params: ussdValues;
  private session: UssdSession | null;
  private user: User | null;
  private paymentReference: string;
  private withdrawalAmount: number;
  private disbursementRequest: DisbursementRequest | null;
  private transactions: Transaction[] | [];
  constructor(
    @InjectModel(UssdSession.name)
    private ussdSessionModel: Model<UssdSessionDocument>,
    @InjectModel(UssdSessionLog.name)
    private ussdSessionLogModel: Model<UssdSessionLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Categories.name)
    private categoryModel: Model<CategoriesDocument>,
    @InjectModel(localGovernment.name)
    private areasModel: Model<localGovernmentDocument>,
    @Inject('moment') private moment: moment.Moment,
    @InjectModel(schedules.name)
    private pickupScheduleModel: Model<schedulesDocument>,
    @InjectModel(Organisation.name)
    private organisationModel: Model<OrganisationDocument>,
    private onesignal: onesignalService,
    private sms_service: smsService,
    private miscService: MiscService,
    //private disbursmentService: DisbursementService,
    private partnerservice: partnerService,
    private slackService: SlackService,
    @InjectModel(notification.name)
    private notificationModel: Model<notificationDocument>,
    @InjectModel(CharityOrganisation.name)
    private charityOrganisationModel: Model<CharityOrganisationDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Pay.name) private payModel: Model<PayDocument>,
    @InjectModel(DisbursementRequest.name)
    private disbursementRequestModel: Model<DisbursementRequestDocument>,
    @InjectModel(Charity.name)
    private charityModel: Model<CharityPaymentDocument>,
    private readonly httpService: HttpService,
  ) {
    this.withdrawalAmount = 0;
    this.transactions = [];
    this.disbursementRequest = null;
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
      '\n00. Quit';

    this.menu_for_msisdn_reg =
      'Welcome to Pakam:' +
      '\n1. Schedule Pick up' +
      '\n2. Wallet Balance' +
      '\n3. Payout' +
      '\n00. Quit';
    this.menu_for_msisdn_without_pin =
      'Welcome to Pakam:' +
      '\n1. Schedule Pick up' +
      '\n2. Wallet Balance' +
      '\n3. Payout' +
      '\n4. Set Transaction Pin' +
      '\n00. Quit';
    this.params = null;
    this.session = null;
    this.user = null;
    this.nextMenu = '';
    this.paymentReference = '';
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

        await this.clearSession();
        await this.openSession();
        return this.result;
      }

      if (params.messageType.toString() == '2') {
        //close session
        await this.clearSession();
        this.result.data.messageType = '2';
        return this.result;
      }
      //get the session
      await this.getSession();
      // initiate payment
      await this.processLevel();
      return this.result;
    } catch (error) {
      console.log(error);
      Logger.error(error);
      return ResponseHandler(error.message, error.httpCode, true, null);
    }
  }

  private async getUser() {
    const phone = this.params.msisdn.slice(3);
    console.log(phone);
    const user = await this.userModel.findOne({
      phone: `0${phone}`,
    });
    if (!user) {
      return (this.user = null);
    }
    return (this.user = user);
  }

  async openSession(): Promise<void> {
    const charge = await lastValueFrom(this.chargeUser());
    console.log(charge);

    let paid = false;
    if (charge.data.statusCode == '0000') {
      paid = true;
    }
    await this.ussdSessionModel.create({
      msisdn: this.params.msisdn,
      sessionId: this.params.sessionId,
      imsi: this.params.imsi,
      messageType: this.params.messageType,
      ussdString: this.params.ussdString,
      response: null,
      lastMenuVisted: null,
      paid,
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
        message: 'Session has not been initiatied',
        verboseMessage: 'Session has not been initiatied',
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
      this.result.data.messageType = '2';
      await this.clearSession();
    }
    if (this.session.sessionState == null && ussdString == '1') {
      // check if phone already registered on pakam
      // if already registered then 1 == schedule pickup
      // else 1 == register
      // handle register for ussd user const user = await this.userModel.findOne({ phone: this.params.msisdn });
      if (this.user) {
        // schedule pickup is the menu select
        await this.schedulePickUp();
      } else {
        await this.registerUser();
      }
    }

    if (this.session.sessionState == null && ussdString == '2') {
      if (this.user) {
        // get wallet balance
        await this.getWalletbalance();
      } else {
        await this.schedulePickUp();
      }
    }

    if (this.session.sessionState == null && ussdString == '3') {
      if (this.user) {
        // handle withdrawal
        await this.withdrawBalance();
      }
    }

    // if (this.session.sessionState == null && ussdString == '4') {
    //   // handle withdrawal
    //   await this.withdrawBalance();
    // }

    if (this.session.sessionState == 'user_registration') {
      await this.registerUser();
    }

    if (this.session.sessionState == 'continue') {
      // return a menu without registration
      this.result.data.messageType = '1';
      this.result.data.inboundResponse = this.menu_for_msisdn_reg;
    }

    if (this.session.sessionState == 'schedule_pickup') {
      await this.schedulePickUp();
    }
    if (this.session.sessionState == 'withdraw') {
      await this.withdrawBalance();
    }
    return this.session;
  }

  async clearSession(): Promise<void> {
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
      const nextMenu = 'Pakam Account created successfully';
      this.result.data.inboundResponse = nextMenu;
      this.result.data.messageType = '1';
      const phone = this.params.msisdn.slice(3);
      const newUser = await this.userModel.create({
        phone: `0${phone}`,
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

  private async schedulePickUp() {
    if (!this.user) {
      const nextMenu =
        'Please Register as a pakam household user to schedule a pickup:' +
        '\n1.Continue' +
        '\n00. Quit';
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession(null, 'continue', null);
      this.result.data.messageType = '2';
      return this.result;
    }
    if (this.session.lastMenuVisted == null) {
      const nextMenu =
        'Select waste category:' +
        '\n1. Nylon' +
        '\n2. Can' +
        '\n3. Satchet water nylon' +
        '\n4. Pure water nylon' +
        '\n5. Carton' +
        '\n6. Pet bottles' +
        '\n7. Shredded Paper' +
        '\n8. Paper' +
        '\n9. Rubber' +
        '\n10. Plastic' +
        '\n11. Tyres' +
        '\n12. Tetra pack';

      this.result.data.inboundResponse = nextMenu;
      this.result.data.messageType = '1';
      await this.updateSession(
        'select waste category',
        'schedule_pickup',
        null,
      );
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'select waste category'
    ) {
      const nextMenu = 'Enter waste quantity';
      this.result.data.inboundResponse = nextMenu;

      if (this.params.ussdString == '1') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'nylon' }, { value: 'nylon' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      if (this.params.ussdString == '2') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'can' }, { value: 'can' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      if (this.params.ussdString == '6') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'Pet bottles' }, { value: 'pet-bottles' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      if (this.params.ussdString == '8') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'Paper' }, { value: 'paper' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      if (this.params.ussdString == '9') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'Rubber' }, { value: 'rubber' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      if (this.params.ussdString == '10') {
        const catDetail = await this.categoryModel.findOne({
          $or: [{ name: 'Plastic' }, { value: 'plastic' }],
        });
        this.session.response = {
          categories: [
            {
              name: catDetail.name,
              catId: catDetail._id,
            },
          ],
        };
      }

      await this.updateSession(
        'Enter waste quantity',
        'schedule_pickup',
        this.session.response,
      );
      this.result.data.messageType = '1';
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Enter waste quantity'
    ) {
      if (!this.session.response.categories) {
        this.session.response['categories'] = [];
        this.session.response['quantity'] = this.params.ussdString;
      }
      this.session.response['categories'] = this.session.response.categories;
      this.session.response['quantity'] = this.params.ussdString;

      const nextMenu = await this.getLga();
      this.result.data.inboundResponse = nextMenu;

      await this.updateSession(
        'Select Local government Area',
        'schedule_pickup',
        this.session.response,
      );
      this.result.data.messageType = '1';
      return this.result;
    }

    // collect local government
    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Select Local government Area'
    ) {
      const lcdResult = await this.getLcd();
      const nextMenu = lcdResult.v;
      this.result.data.inboundResponse = nextMenu;
      this.session.response['categories'] = this.session.response.categories
        ? this.session.response.categories
        : [];
      this.session.response['quantity'] = this.session.response.quantity
        ? this.session.response.quantity
        : '';
      this.session.response['lga'] = lcdResult.valueInString;

      await this.updateSession(
        'Select Access Area',
        'schedule_pickup',
        this.session.response,
      );
      this.result.data.messageType = '1';
      return this.result;
    }

    // collect access area
    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Select Access Area'
    ) {
      const value = await this.storeLcd();
      this.result.data.inboundResponse = 'Enter a pickup address';
      this.session.response['categories'] = this.session.response.categories
        ? this.session.response.categories
        : [];
      this.session.response['quantity'] = this.session.response.quantity
        ? this.session.response.quantity
        : '';
      this.session.response['lga'] = this.session.response.lga
        ? this.session.response.lga
        : '';
      this.session.response['lcd'] = value;
      await this.updateSession(
        'Enter a pickup address',
        'schedule_pickup',
        this.session.response,
      );
      this.result.data.messageType = '1';
      return this.result;
    }

    // collect pickup address
    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Enter a pickup address'
    ) {
      await this.createPickupSchedule();
      this.result.data.messageType = '2';
      this.result.data.inboundResponse = 'Pickup scheduled successfully';
      await this.updateSession(null, 'continue', null);
    }
  }

  // private async scheduleDropOff() {}

  private async getWalletbalance() {
    if (!this.user) {
      const nextMenu =
        'Please Register as a pakam household user:' +
        '\n1.Continue' +
        '\n00. Quit';
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession(null, 'continue', null);
      return this.result;
    }

    const message = `Your current balance is ${this.user.availablePoints}`;
    this.result.data.inboundResponse = message;
    await this.updateSession(null, 'continue', null);
    this.result.data.messageType = '2';
    return this.result;
  }

  private async withdrawBalance() {
    if (!this.user) {
      const nextMenu =
        'Please Register as a pakam household user:' +
        '\n1.Continue' +
        '\n00. Quit';
      this.result.data.inboundResponse = nextMenu;
      await this.updateSession(null, 'continue', null);
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Set a transaction pin to continue'
    ) {
      this.user.transactionPin = this.params.ussdString;
      await this.userModel.updateOne(
        { _id: this.user._id },
        { transactionPin: this.params.ussdString },
      );
      const menu =
        'Select payout option:' +
        '\n1. Direct to Bank' +
        '\n2. Direct to charity';
      this.result.data.inboundResponse = menu;
      this.result.data.messageType = '1';
      await this.updateSession(
        'Select payout option',
        'withdraw',
        this.session.response,
      );
      return this.result;
    }

    if (this.session.lastMenuVisted == null) {
      if (!this.user.transactionPin) {
        this.result.data.inboundResponse = 'Set a transaction pin to continue';
        this.result.data.messageType = '1';
        await this.updateSession(
          'Set a transaction pin to continue',
          'withdraw',
          this.session.response,
        );
        return this.result;
      }
      const menu =
        'Select payout option:' +
        '\n1. Direct to Bank' +
        '\n2. Direct to charity';
      this.result.data.inboundResponse = menu;
      this.result.data.messageType = '1';
      await this.updateSession('Select payout option', 'withdraw', null);
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Select payout option'
    ) {
      if (this.params.ussdString == '1') {
        const banks = await this.getBanks();
        this.result.data.inboundResponse = banks;
        await this.updateSession(
          'Select a bank',
          'withdraw',
          this.session.response,
        );
      } else {
        // select charity organizations
        this.result.data.inboundResponse = await this.getCharityOrganisations();
        await this.updateSession(
          'Select an Organisation',
          'withdraw',
          this.session.response,
        );
      }
      this.result.data.messageType = '1';
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Select a bank'
    ) {
      // handle bank withdrawal
      console.log('s', this.session.response);
      const banks = await this.pickedBank();

      if (this.session.response == null) {
        this.session.response = { bank: banks };
      } else {
        this.session.response['bank'] = banks;
      }

      this.result.data.inboundResponse = 'Enter account number';
      this.result.data.messageType = '1';
      await this.updateSession(
        'Enter account number',
        'withdraw',
        this.session.response,
      );
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Enter account number'
    ) {
      const resolveAc = await this.verifyAccountNumber();
      if (resolveAc.error || resolveAc.statusCode != 200) {
        this.result.data.inboundResponse = 'Invalid account number';
        this.result.data.messageType = '2';
        return this.result;
      }

      this.session.response['accountResolve'] = resolveAc.data.accountResult;
      const accountName = resolveAc.data.accountResult.account_name;
      const menu = `${accountName}\n Enter transaction pin`;
      this.result.data.inboundResponse = menu;
      this.result.data.messageType = '1';
      await this.updateSession(
        'Enter transaction pin',
        'withdraw',
        this.session.response,
      );
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Enter transaction pin'
    ) {
      if (this.params.ussdString !== this.user.transactionPin) {
        this.result.data.inboundResponse = 'Invalid Transaction point';
        this.result.data.messageType = '2';
        return this.result;
      }

      // handle the payment
      return await this.handleBankPayOut();

      // this.result.data.inboundResponse = 'Payment initiated successfully';
      // this.result.data.messageType = '2';
      // return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Select an Organisation'
    ) {
      const organisation = await this.organisationValue();
      console.log('or', organisation);
      if (this.session.response == null) {
        this.session.response = { organisation };
      } else {
        this.session.response.organisation = organisation;
      }
      // handle organization
      // TODO
      // get the amount to send to organisation
      // send otp
      // disburse to organisation
      this.result.data.inboundResponse = 'Enter amount';
      this.result.data.messageType = '1';
      await this.updateSession(
        'Enter amount',
        'withdraw',
        this.session.response,
      );
      return this.result;
    }

    if (
      this.session.lastMenuVisted !== null &&
      this.session.lastMenuVisted == 'Enter amount'
    ) {
      const amount = parseInt(this.params.ussdString);
      if (amount > this.user.availablePoints) {
        this.result.data.inboundResponse = 'Insufficient available balance';
        this.result.data.messageType = '2';
        return this.result;
      }
      const newBalance = +this.user.availablePoints - amount;
      const charityPayment = await this.charityModel.create({
        userId: this.user._id.toString(),
        fullname: this.user.fullname,
        charity: this.session.response.organisation._id,
        amount,
        cardID: this.user._id.toString(),
      });
      await this.userModel.updateOne(
        { _id: this.user._id },
        {
          availablePoints: newBalance,
        },
      );
      await this.sendCharityNotification(charityPayment);
      this.result.data.inboundResponse = 'Payment Made successfully';
      this.result.data.messageType = '2';
      return this.result;
    }
  }

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

  private async getLga() {
    const areas = await this.areasModel
      .find({ state: 'Lagos' })
      .select({ lga: 1, _id: 0 });

    const result = areas.reduce((acc, current) => {
      const doExist = acc.find((d) => d['lga'] === current['lga']);
      if (!doExist) return [...acc, current];
      return acc;
    }, []);
    //const values = result.map((result) => result.lga);
    let v = 'Select Local government Area:';
    for (let i = 0; i < result.length; i++) {
      v += `\n${i + 1}. ${result[i].lga}`;
    }
    return v;
  }

  private async getLcd() {
    const areas = await this.areasModel
      .find({ state: 'Lagos' })
      .select({ lga: 1, _id: 0 });

    const result = await this.removeObjDuplicate(areas, 'lga');
    const index = parseInt(this.params.ussdString) - 1;
    const valueInString = result[index].lga;
    const accessAreas = await this.areasModel
      .find({
        state: 'Lagos',
        lga: valueInString,
      })
      .select({ lcd: 1, _id: 0 });
    const lca = await this.removeObjDuplicate(accessAreas, 'lcd');
    let v = 'Select Access Area:';
    for (let i = 0; i < lca.length; i++) {
      v += `\n${i + 1}. ${lca[i].lcd}`;
    }
    return {
      v,
      valueInString,
    };
  }

  private async removeObjDuplicate(arr: any, field: string) {
    const result = arr.reduce((acc, current) => {
      const doExist = acc.find((d) => d[field] === current[field]);
      if (!doExist) return [...acc, current];
      return acc;
    }, []);
    return result;
  }

  private async storeLcd() {
    const lcd = await this.areasModel
      .find({ state: 'Lagos', lga: this.session.response.lga })
      .select({ lcd: 1, _id: 0, slug: 1 });
    const index = parseInt(this.params.ussdString) - 1;
    const valueInString = lcd[index].slug;

    return valueInString;
  }

  private async pickedBank() {
    const value = parseInt(this.params.ussdString);
    const bank = banklist[value];
    return bank;
  }

  private async createPickupSchedule() {
    const pickupDate = this.moment.add(1, 'days');
    const expireDate = pickupDate.add(7, 'days');
    const remainderDate = pickupDate.add(6, 'days');
    const schedule = await this.pickupScheduleModel.create({
      client: this.user.email,
      clientId: this.user._id.toString(),
      scheduleCreator: this.user.username.trim(),
      categories: this.session.response.categories,
      Category: this.session.response.categories[0].name.trim(),
      quantity: this.session.response.quantity,
      expiryDuration: expireDate,
      remainderDate,
      state: 'Lagos',
      phone: this.user.phone,
      address: this.params.ussdString.trim(),
      reminder: true,
      callOnArrival: true,
      lcd: this.session.response.lcd,
      pickUpDate: pickupDate,
      channel: 'ussd',
      long: 0,
      lat: 0,
    });
    const organisations = await this.organisationModel.aggregate([
      {
        $match: {
          streetOfAccess: { $in: [schedule.lcd] },
          'categories.catId': { in: schedule.Category },
        },
      },
      {
        $addFields: {
          _id: {
            $toString: '$_id',
          },
        },
      },
      {
        $lookup: {
          from: 'collectors',
          localField: '_id',
          foreignField: 'organisationId',
          as: 'collectors',
        },
      },
    ]);

    await Promise.all(
      organisations.map(async (organisation) => {
        organisation.collectors.map(async (collector) => {
          const message = `A user in ${schedule.lcd} just requested for a pickup of is waste item ${schedule.Category}`;
          if (collector.onesignal_id) {
            //send notification
            await this.storeNotification(message, schedule, 'pickup');
            await this.onesignal.sendPushNotification(
              message,
              collector.onesignal_id,
            );
          }
        });
      }),
    );

    //const sms = `Hello ${this.user.username} your ${schedule.Category} pickup request been placed successfully`;
    // const content = {
    //   sms,
    //   phone: this.user.phone,
    // };
    //await this.sms_service.sendSms(content);
  }

  private async storeNotification(
    message: string,
    schedule: any,
    type: string,
  ) {
    return await this.notificationModel.create({
      title: 'Pick Schedule Missed',
      lcd: schedule.user.lcd,
      message,
      schedulerId: schedule.user._id,
      notification_type: type,
      scheduleId: schedule._id,
    });
  }

  private async getBanks() {
    let v = 'Select a bank:';
    for (let i = 0; i < banklist.length; i++) {
      v += `\n${i + 1}. ${banklist[i].name}`;
    }
    return v;
  }

  private async getCharityOrganisations() {
    const organisations = await this.charityOrganisationModel.find({});
    let v = 'Select an Organisation:';
    for (let i = 0; i < organisations.length; i++) {
      v += `\n${i + 1}. ${organisations[i].name}`;
    }

    return v;
  }

  private async organisationValue() {
    const organisations = await this.charityOrganisationModel.find({});
    const index = parseInt(this.params.ussdString) - 1;
    const organisation = organisations[index];
    return organisation;
  }

  private async verifyAccountNumber() {
    const value = {
      accountNumber: this.params.ussdString,
      BankCode: this.session.response.bank.value,
      userId: this.user._id.toString(),
      referenceId: '',
    };
    const resolve = await this.miscService.resolveAccountNumber(value);
    return resolve;
  }

  private async handleBankPayOut() {
    this.paymentReference = `${generateReference(6, false)}${Date.now()}`;
    this.session.response.paymentReference = this.paymentReference;

    await this.confirmAndDebitAmount();
    const transactions = await this.getUserTransactions();
    await this.storePayoutRequest(transactions);
    await this.processPayment();

    return this.result;
  }

  private async confirmAndDebitAmount() {
    const availablePoints = Number(this.user.availablePoints);
    const min_withdrawalable_amount =
      process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;
    if (availablePoints < +min_withdrawalable_amount) {
      this.result.data.inboundResponse = 'Insufficient available balance';
      this.result.data.messageType = '2';
      return this.result;
    }

    const withdrawalAmount =
      +this.user.availablePoints - Number(process.env.APP_CHARGE);

    // store disbursement request
    const disbursementRequest = await this.disbursementRequestModel.create({
      userType: 'household',
      channel: 'ussd',
      user: this.user._id,
      currency: 'NGN',
      amount: +this.user.availablePoints,
      charge: +env('APP_CHARGE'),
      withdrawalAmount,
      type: 'gain',
      bankCode: this.session.response.bank.value,
      beneName: this.session.response.accountResolve.account_name,
      destinationBankCode: this.session.response.bank.nibbsCode,
      nesidNumber: this.session.response.accountResolve.neSid,
      nerspNumber: this.session.response.accountResolve.neresp,
      kycLevel: this.session.response.accountResolve.kycLevel,
      bvn: this.session.response.accountResolve.beneBVN,
      transactionType:
        this.session.response.bank.name.toLowerCase() == 'sterling bank'
          ? '0'
          : '1',
      otp: '',
      otpExpiry: null,
      referenceCode: `${generateReference(6, false)}${Date.now()}`,
      principalIdentifier: `${generateReference(8, false)}${Date.now()}`,
      paymentReference: `Pakam Transfer to ${this.session.response.bank.name}|${this.session.response.accountResolve.account_name}`,
    });

    if (!disbursementRequest) {
      (this.result.data.inboundResponse = 'Session close'),
        (this.result.data.messageType = '2');
      return this.result;
    }

    await this.userModel.updateOne(
      { _id: this.user._id },
      {
        availablePoints: 0,
      },
    );
    this.disbursementRequest = disbursementRequest;
    this.withdrawalAmount = withdrawalAmount;
    return this.withdrawalAmount;
  }

  private async getUserTransactions() {
    const condition = {
      paid: false,
      //requestedForPayment: false,
      cardID: this.user._id,
    };

    const transactions = await this.transactionModel.find(condition);
    if (transactions.length <= 0) {
      this.result.data.inboundResponse = 'You have no unpaid schedule';
      this.result.data.messageType = '2';
      return this.result;
    }

    this.transactions = transactions;
    return transactions;
  }

  private async storePayoutRequest(transactions: any) {
    console.log('tran', transactions);
    if (!Array.isArray(transactions)) {
      this.result.data.inboundResponse = 'You have no unpaid schedule';
      this.result.data.messageType = '2';
      return this.result;
    }
    Promise.all(
      transactions.map(async (transaction: Transaction) => {
        await this.payModel.create({
          user: this.user._id,
          transaction: transaction._id,
          aggregatorId: transaction.aggregatorId,
          aggregatorName: transaction.recycler,
          aggregatorOrganisation: transaction.organisation,
          organisation: transaction.organisation,
          organisationID: transaction.organisationID,
          scheduleId: transaction.scheduleId,
          quantityOfWaste: transaction.weight,
          amount: transaction.coin,
          state: transaction.state,
          userPhone: this.user.phone,
          reference: this.paymentReference,
        });

        await this.transactionModel.updateOne(
          { _id: transaction._id },
          {
            paid: true,
            requestedForPayment: true,
            paymentResolution: 'gain',
          },
        );
      }),
    );

    return;
  }

  private async processPayment() {
    const partner = process.env.PARTNER_NAME;
    const config = disbursementConfig.find((item: any) => {
      return partner == item.partnerName;
    });

    const configCapAmount = config?.capAmount;
    const disbursementAmount = this.withdrawalAmount;
    if (ProcessingType.manual == config?.processingType) {
      return await this.processDisbursementManually(this.withdrawalAmount);
    }

    if (
      ProcessingType.automatic == config?.processingType &&
      configCapAmount >= disbursementAmount
    ) {
      return await this.processDisbursementAutomatically(config.partnerName);
    }

    if (
      ProcessingType.automatic == config.processingType &&
      configCapAmount < disbursementAmount
    ) {
      return await this.processDisbursementManually(this.withdrawalAmount);
    }
  }

  private processDisbursementManually = async (withdrawalAmount: number) => {
    const slackData =
      this.getManualDisbursementSlackNotificationData(withdrawalAmount);
    console.log(slackData);
    this.result.data.inboundResponse =
      'Transaction processing. Payment will be made within 5 working days';
    this.result.data.messageType = '2';
    this.slackService.sendMessage(slackData);
    return this.result;
  };

  private getManualDisbursementSlackNotificationData = (
    withdrawalAmount: number,
  ) => {
    return {
      category: SlackCategories.Disbursement,
      event: DisbursementStatus.initiated,
      data: {
        //id: this.disbursementRequest._id,
        type: DisbursementType.bank,
        channel: 'ussd',
        paymentType: 'Manual',
        reference: this.paymentReference,
        amount: withdrawalAmount,
        username: this.user.fullname,
        userAvailablePoint: this.user.availablePoints,
        accountName: this.session.response.accountResolve.account_name,
        accountNumber: this.session.response.accountResolve.account_name,
        bankCode: this.session.response.bank.value,
        bankName: this.session.response.bank.name,
        charge: process.env.APP_CHARGE,
        user: 'household',
        message: 'Manual Payment',
      },
    };
  };

  private processDisbursementAutomatically = async (partnerName: string) => {
    if (
      this.session.response.bank.name.toLowerCase() == 'sterling bank' ||
      this.session.response.bank.name.toLowerCase() == 'sterling'
    ) {
      // send disbursement initated notification
      await this.automaticDisbursementNotification(
        partnerName,
        'intraBank Transfer',
      );
      // intraBankTransfer
      return await this.intraBankTransfer(partnerName);
    }
    await this.automaticDisbursementNotification(
      partnerName,
      'nipBank Transfer',
    );

    //nipTransfer
    return await this.nipTransfer(partnerName);
  };

  private async automaticDisbursementNotification(
    partnerName: string,
    method: string,
  ) {
    const slackNotificationData = {
      category: 'disbursement',
      event: DisbursementStatus.initiated,
      data: {
        requestFailedType: 'partner_processing_initiated',
        partnerName,
        channel: 'ussd',
        userId: this.user._id,
        reference: this.paymentReference,
        amount: this.withdrawalAmount,
        userAvailablePoint: this.user.availablePoints,
        username: this.user.firstname,
        accountName: this.session.response.accountResolve.account_name,
        accountNumber: this.session.response.accountResolve.account_number,
        bankCode: this.session.response.bank.value,
        charge: env('APP_CHARGE'),
        message: 'Transaction is been processed automatically',
        method,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  }

  private intraBankTransfer = async (partnerName: string) => {
    const partnerData = {
      partnerName,
      action: 'intraBankTransfer',
      data: {
        fromAccount: env('PAKAM_ACCOUNT'),
        toAccount: this.disbursementRequest.destinationAccount,
        requestId: this.disbursementRequest.reference,
        TransactionType: 26,
        DifferentTradeValueDate: 0,
        TransactionAmount: this.disbursementRequest.withdrawalAmount,
        CurrencyCode: '566',
        PaymentReference: this.disbursementRequest.referenceCode,
        NarrationLine1: `Pakam payment to ${this.disbursementRequest.beneName}`,
        NarrationLine2: '',
        BeneficiaryName: this.disbursementRequest.beneName,
        SenderName: env('ACCOUNT_NAME'),
        TransactionNumber: this.disbursementRequest.principalIdentifier,
        ValueDate: this.moment.format('DD-MM-YYYY'),
      },
    };

    const partnerResponse = await this.partnerservice.initiatePartner(
      partnerData,
    );

    if (!partnerResponse.success || partnerResponse.httpCode === 403) {
      await this.rollBack();
      let errorMsg = '';
      let partnerMsg = '';
      if (
        typeof partnerResponse.error === 'object' ||
        Array.isArray(partnerResponse.error)
      ) {
        errorMsg = JSON.stringify(partnerResponse.error);
      } else if (typeof partnerResponse.error === 'string') {
        errorMsg = partnerResponse.error.toString();
      } else {
        errorMsg = '';
      }

      if (
        typeof partnerResponse.partnerResponse === 'object' ||
        Array.isArray(partnerResponse.partnerResponse)
      ) {
        partnerMsg = JSON.stringify(partnerResponse.partnerResponse);
      } else if (typeof partnerResponse.partnerResponse === 'string') {
        partnerMsg = partnerResponse.partnerResponse.toString();
      } else {
        partnerMsg = '';
      }
      await this.sendPartnerFailedNotification(
        errorMsg,
        partnerMsg,
        partnerName,
        'intraBank',
      );
      // roll back

      // const msg = 'Payout Request Failed';
      this.result.data.inboundResponse = 'Payout Request Failed';
      this.result.data.messageType = '2';
      return this.result;
    }
    this.result.data.inboundResponse = 'Payment initiated successfully';
    this.result.data.messageType = '2';
    return this.result;
  };

  private nipTransfer = async (partnerName: string) => {
    console.log(
      'this.disbursementRequest.bankCode',
      this.disbursementRequest.destinationBankCode,
    );
    // const bank = banklists.find((bank: any) => {
    //   return this.disbursementRequest.destinationBankCode == bank.value;
    // });
    //console.log('nip transfer', bank);
    const partnerData = {
      partnerName,
      action: 'nipTransfer',
      data: {
        fromAccount: env('PAKAM_ACCOUNT'),
        toAccount: this.disbursementRequest.destinationAccount,
        amount: this.disbursementRequest.withdrawalAmount.toFixed(2),
        principalIdentifier: this.disbursementRequest.principalIdentifier,
        referenceCode: this.disbursementRequest.referenceCode,
        requestCode: this.disbursementRequest.referenceCode,
        beneficiaryName: this.disbursementRequest.beneName,
        paymentReference: this.disbursementRequest.paymentReference,
        customerShowName: env('ACCOUNT_NAME'),
        channelCode: '2',
        destinationBankCode: this.disbursementRequest.destinationBankCode,
        nesid: this.disbursementRequest.nesidNumber,
        nersp: this.disbursementRequest.nerspNumber,
        beneBVN: this.disbursementRequest.bvn,
        beneKycLevel: this.disbursementRequest.kycLevel,
        requestId: this.disbursementRequest.reference,
      },
    };
    console.log(partnerData);
    const partnerResponse = await this.partnerservice.initiatePartner(
      partnerData,
    );

    console.log('partner response', partnerResponse);
    if (!partnerResponse.success || partnerResponse.httpCode === 403) {
      await this.rollBack();
      let errorMsg = '';
      let partnerMsg = '';
      if (
        typeof partnerResponse.error === 'object' ||
        Array.isArray(partnerResponse.error)
      ) {
        errorMsg = JSON.stringify(partnerResponse.error);
      } else if (typeof partnerResponse.error === 'string') {
        errorMsg = partnerResponse.error.toString();
      } else {
        errorMsg = '';
      }

      if (
        typeof partnerResponse.partnerResponse === 'object' ||
        Array.isArray(partnerResponse.partnerResponse)
      ) {
        partnerMsg = JSON.stringify(partnerResponse.partnerResponse);
      } else if (typeof partnerResponse.partnerResponse === 'string') {
        partnerMsg = partnerResponse.partnerResponse.toString();
      } else {
        partnerMsg = '';
      }
      await this.sendPartnerFailedNotification(
        errorMsg,
        partnerMsg,
        partnerName,
        'nipTransfer',
      );
      this.result.data.inboundResponse = 'Payout Request Failed';
      this.result.data.messageType = '2';
      return this.result;
    }
    this.result.data.inboundResponse = 'Payment initiated successfully';
    this.result.data.messageType = '2';
    return this.result;
  };

  private sendPartnerFailedNotification = async (
    message: string,
    partnerMsg: string,
    parterName: string,
    method: string,
  ) => {
    const slackNotificationData = {
      category: 'disbursement',
      event: DisbursementStatus.failed,
      data: {
        requestFailedType: 'partner_processing_transaction',
        parterName,
        id: this.disbursementRequest._id,
        reference: this.disbursementRequest.reference,
        amount: this.disbursementRequest.withdrawalAmount,
        username: this.user.firstname,
        userAvailablePoint: this.user.availablePoints,
        accountName: this.disbursementRequest.beneName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.destinationBankCode,
        charge: env('APP_CHARGE'),
        message,
        partnerMsg,
        method,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  };

  private rollBack = async () => {
    await Promise.all(
      this.transactions.map(async (transaction: Transaction) => {
        await this.payModel.deleteOne({ transaction: transaction._id });
        await this.transactionModel.updateOne(
          { _id: transaction._id },
          {
            paid: false,
            requestedForPayment: false,
            paymentResolution: '',
          },
        );
      }),
    );
    await this.userModel.updateOne(
      { _id: this.user._id },
      { availablePoints: this.disbursementRequest.amount },
    );
  };

  private sendCharityNotification = async (charity: Charity) => {
    const slackNotificationData = {
      category: 'disbursement',
      event: DisbursementStatus.successful,
      data: {
        id: charity._id,
        charityOrganisationId: charity.charity,
        charityOrganisationName: this.session.response.organisation.name,
        amount: charity.amount,
        userId: charity.userId,
        fullname: charity.fullname,
        message: 'Payment made to charity',
        type: 'charity',
        channel: 'ussd',
      },
    };
    return this.slackService.sendMessage(slackNotificationData);
  };

  private chargeUser(): Observable<AxiosResponse<any>> {
    const body = {
      subscriptionProviderId: process.env.subProviderID,
      subscriptionId: process.env.subID,
      nodeId: process.env.nodeID,
      subscriptionDescription: process.env.subDescription,
      bundleType: process.env.BUNDLE_TYPE,
      amountCharged: process.env.USSD_CHARGE,
      registrationChannel: process.env.REG_CHANNEL,
      senderAddress: '20092',
    };
    console.log('b', body);
    const url = `${process.env.USSD_PAYMENT_URL}customers/${this.params.msisdn}/subscriptions`;
    const result = this.httpService.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        transactionId: process.env.SPID,
        'API-TOKEN': process.env.API_TOKEN,
      },
    });
    return result;
  }
}
