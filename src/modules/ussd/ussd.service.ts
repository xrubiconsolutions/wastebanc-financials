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
import { ResponseHandler } from './../../utils/misc';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ussdResult, ussdValues } from './ussd.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UssdSessionLogDocument } from '../schemas/ussdSessionLog.schema';
import { User } from '../schemas/user.schema';
import banklist from '../misc/ngnbanklist.json';

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
    @InjectModel(notification.name)
    private notificationModel: Model<notificationDocument>,
    @InjectModel(CharityOrganisation.name)
    private charityOrganisationModel: Model<CharityOrganisationDocument>,
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
      '\n00. Quit';

    this.menu_for_msisdn_reg =
      'Welcome to Pakam:' +
      '\n1. Schedule Pick up' +
      '\n2. Wallet Balance' +
      '\n3. Payout' +
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
      await this.closeSession();
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
      const nextMenu =
        'Pakam Account created successfully:' + '\n1.Continue' + '\n00. Quit';
      this.result.data.inboundResponse = nextMenu;
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

    if (this.session.lastMenuVisted == null) {
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
      const banks = await this.pickedBank();
      console.log('banks', banks);
      console.log('s', this.session.response);
      if (!this.session.response.bank) {
        this.session.response.bank = banks;
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
      this.session.lastMenuVisted == 'Select an Organisation'
    ) {
      // handle organization
      // TODO
      // get the amount to send to organisation
      // send otp
      // disburse to organisation
      this.result.data.inboundResponse = 'coming soon';
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
}
