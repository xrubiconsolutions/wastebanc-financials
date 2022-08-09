import { partnerService } from './../partners/partnersService';
// import { generateReference } from './../../utils/misc';
import {
  Organisation,
  OrganisationDocument,
} from './../schemas/organisation.schema';
import { smsService } from './../notification/sms/sms.service';
import { SlackCategories } from './../notification/slack/slack.enum';
import { SlackService } from './../notification/slack/slack.service';
import {
  Charity,
  CharityPaymentDocument,
} from './../schemas/charitypayment.schema';
import { CharityOrganisationDocument } from './../schemas/charityorganisation.schema';
import {
  DisbursementStatus,
  DisbursementType,
  ProcessingType,
} from './disbursement.enum';
import { Pay, PayDocument } from '../schemas/payment.schema';
import { User, UserDocument } from '../schemas/user.schema';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transactions.schema';
import { UnprocessableEntityError } from '../../utils/errors/errorHandler';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from '../schemas/disbursementRequest.schema';
import { InitiateDTO } from './disbursement.dto';
import disbursementConfig from './disbursement.config.json';
import { Injectable } from '@nestjs/common';
import { CharityOrganisation } from '../schemas/charityorganisation.schema';
import banklists from '../misc/ngnbanklist.json';
@Injectable()
export class DisbursementService {
  private params: InitiateDTO;
  public disbursementRequest: DisbursementRequest | null;
  private transactions: Transaction[] | [];
  private user: User | null;
  public message = '';

  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Pay.name) private payModel: Model<PayDocument>,
    @InjectModel(CharityOrganisation.name)
    private charityModel: Model<CharityOrganisationDocument>,
    @InjectModel(Charity.name)
    private charitypaymentModel: Model<CharityPaymentDocument>,
    private slackService: SlackService,
    private sms_service: smsService,
    @InjectModel(Organisation.name)
    private organisationModel: Model<OrganisationDocument>,
    private partnerservice: partnerService,
  ) {}

  public initiate = async (params: InitiateDTO) => {
    this.params = params;
    this.disbursementRequest = null;
    this.user = null;
    this.transactions = [];
    this.message = '';

    await this.getDisbursementRequest();
    await this.getUser();
    await this.getUserTransactions();
    await this.confirmAndDebitAmount();
    await this.storeDisbursement();
    await this.processDisbursement();

    return this.message;
  };

  private getUser = async () => {
    const user = await this.userModel.findById(this.params.userId);
    if (!user)
      throw new UnprocessableEntityError({
        message: 'user not found',
        verboseMessage: 'user not found',
      });

    this.user = user;
    return this.user;
  };
  private storeDisbursement = async () => {
    if (this.disbursementRequest.type == DisbursementType.charity) {
      const charityPayment = await this.charityModel.create({
        user: this.user._id,
        charity: this.disbursementRequest.charity,
      });
      return charityPayment;
    }
    await Promise.all(
      this.transactions.map(async (transaction) => {
        await this.storePaymentRequest(transaction);
        await this.transactionModel.updateOne(
          { _id: transaction._id },
          {
            paid: true,
            requestedForPayment: true,
            paymentResolution: this.disbursementRequest.type,
          },
        );
      }),
    );
    return this.transactions;
  };
  private getDisbursementRequest = async () => {
    const condition = {
      _id: this.params.requestId,
      otp: this.params.otp,
      user: this.params.userId,
    };
    const disbursementRequest = await this.disbursementModel.findOne(condition);

    if (!disbursementRequest)
      throw new UnprocessableEntityError({
        message: 'Invalid Payout request',
        verboseMessage: 'Invalid Payout request',
      });

    const currentDate = new Date();
    if (disbursementRequest.otpExpiry > currentDate) {
      throw new UnprocessableEntityError({
        message: 'OTP has expired',
        verboseMessage: 'OTP has expired',
      });
    }

    this.disbursementRequest = disbursementRequest;
    return this.disbursementRequest;
  };

  private confirmAndDebitAmount = async () => {
    console.log('debution');
    const availablePoints = Number(this.user.availablePoints);
    if (availablePoints < 0) {
      throw new UnprocessableEntityError({
        message: 'You do not have enough points to complete this transaction',
        verboseMessage:
          'You do not have enough points to complete this transaction',
      });
    }

    if (availablePoints < 5000) {
      throw new UnprocessableEntityError({
        message: 'You do not have enough points to complete this transaction',
        verboseMessage:
          'You do not have enough points to complete this transaction',
      });
    }
    const balance = availablePoints - this.disbursementRequest.amount;

    await this.userModel.updateOne(
      { _id: this.user._id },
      {
        availablePoints: balance,
      },
    );

    return balance;
  };

  private processDisbursement = async () => {
    if (this.disbursementRequest.type == DisbursementType.charity) {
      await this.processCharityDisbursement();
      return (this.message =
        'Payout has been made to charity organisation account');
    } else {
      await this.processBankDisbursement();
      return (this.message = 'Payout initiated successfully');
    }
  };

  private processBankDisbursement = async () => {
    const partner = process.env.PARTNER_NAME;
    const config = disbursementConfig.find((item: any) => {
      return partner == item.partnerName;
    });

    if (ProcessingType.manual == config?.processingType) {
      return await this.processDisbursementManually();
    }

    if (ProcessingType.company == config?.processingType) {
      return await this.processDisbursementByCompany();
    }

    if (ProcessingType.automatic == config?.processingType) {
      return await this.processDisbursementAutomatically(config.partnerName);
    }
  };
  private processCharityDisbursement = async () => {
    const charity = await this.charityModel.findById(
      this.disbursementRequest.charity,
    );

    if (!charity) {
      throw new UnprocessableEntityError({
        message: 'Charity Organisation not found',
        verboseMessage: 'Charity Organisation not found',
      });
    }
    const charityPayment = await this.charityModel.create({
      user: this.user._id,
      charity: charity._id,
    });

    const paymentData = this.getCharityPaymentSlackNotification(charityPayment);

    await this.slackService.sendMessage(paymentData);
    return charity;
  };

  private getUserTransactions = async () => {
    const condition = {
      paid: false,
      requestedForPayment: false,
      cardID: this.user._id,
      completedBy: '',
    };
    const transactions = await this.transactionModel.find(condition);
    if (transactions.length <= 0)
      throw new UnprocessableEntityError({
        message: 'User has no unpaid transactions',
        verboseMessage: 'User has no unpaid transactions',
      });
    this.transactions = transactions;
    return this.transactions;
  };

  private storePaymentRequest = async (transaction: Transaction) => {
    return await this.payModel.create({
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
      reference: this.disbursementRequest.reference,
    });
  };

  private processDisbursementManually = async () => {
    console.log('hanled manually');
    const slackData = this.getBankDisbursementSlackNotification();
    console.log(slackData);
    return this.slackService.sendMessage(slackData);
  };

  private processDisbursementByCompany = async () => {
    // send out sms to companies
    console.log('hanlded by company');
    return this.handleCompanySmsNotification();
  };

  private processDisbursementAutomatically = async (partnerName: string) => {
    if (
      this.disbursementRequest.bankName.toLowerCase() == 'sterling bank' ||
      this.disbursementRequest.bankName.toLowerCase() == 'sterling'
    ) {
      this.intraBankTransfer(partnerName);
    }
    this.nipTransfer(partnerName);
    return (this.message = 'Payout initiated successfully');
  };

  private getCharityPaymentSlackNotification = (
    charityOrg: CharityOrganisation,
  ) => {
    return {
      category: SlackCategories.Requests,
      event: DisbursementStatus.initiated,
      data: {
        _id: charityOrg._id,
        type: DisbursementType.charity,
        charityName: charityOrg.name,
        bank: charityOrg.bank,
        accountNumber: charityOrg.accountNumber,
      },
    };
  };

  private getBankDisbursementSlackNotification = () => {
    return {
      category: SlackCategories.Disbursement,
      event: DisbursementStatus.initiated,
      data: {
        id: this.disbursementRequest._id,
        type: DisbursementType.bank,
        amount: this.disbursementRequest.amount,
        bankName: this.disbursementRequest.bankName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.destinationBankCode,
        user_fullname: this.user.fullname,
        phone: this.user.phone,
      },
    };
  };

  private handleCompanySmsNotification = async () => {
    await Promise.all(
      this.transactions.map(async (transaction: Transaction) => {
        const organisation = await this.organisationModel.findById(
          transaction.organisationID,
        );
        if (organisation) {
          await this.sms_service.sendSms({
            phone: organisation.phone,
            organisationName: organisation.companyName,
            userName: this.user.fullname,
          });
        }
      }),
    );
    return this.transactions;
  };

  private nipTransfer = async (partnerName: string) => {
    const bank = banklists.find((bank: any) => {
      return this.disbursementRequest.bankCode == bank.value;
    });
    const partnerData = {
      partnerName,
      action: 'nipTransfer',
      data: {
        fromAccount: '0503527719',
        toAmount: this.disbursementRequest.destinationAccount,
        amount: this.disbursementRequest.amount,
        principalIdentifier: '',
        referenceCode: this.disbursementRequest.reference,
        beneficiaryName: this.disbursementRequest.beneName,
        paymentReference: this.disbursementRequest.reference,
        customerShowName: 'Pakam',
        channelCode: bank.nibbsCode,
        nesid: this.disbursementRequest.nesidNumber,
        nersp: this.disbursementRequest.nerspNumber,
        beneBVN: this.disbursementRequest.bvn,
        requestId: this.disbursementRequest.reference,
      },
    };

    try {
      const partnerResponse = await this.partnerservice.initiatePartner(
        partnerData,
      );

      console.log('partner response', partnerResponse);
      return partnerResponse;
    } catch (error) {
      console.log(error);
      const slackData = this.getFailedNotification(error.message);
      await this.slackService.sendMessage(slackData);
      throw new UnprocessableEntityError({
        message: error.message,
        httpCode: error.status,
        verboseMessage: error.statusText,
      });
    }
  };

  private intraBankTransfer = async (partnerName: string) => {
    const partnerData = {
      partnerName,
      action: 'intraBankTransfer',
      data: {
        fromAccount: '0503527719',
        toAmount: this.disbursementRequest.destinationAccount,
        TransactionType: 26,
        DifferentTradeValueDate: 0,
        TransactionAmount: this.disbursementRequest.amount,
        CurrencyCode: '566' || 'NGN',
        PaymentReference: this.disbursementRequest.reference,
        NarrationLine1: `Pakam payment to ${this.user.fullname}`,
        NarrationLine2: '',
        BeneficiaryName: this.disbursementRequest.beneName,
        SenderName: 'Pakam',
      },
    };

    try {
      const partnerResponse = await this.partnerservice.initiatePartner(
        partnerData,
      );
      return partnerResponse;
    } catch (error: any) {
      console.log(error);
      const slackData = this.getFailedNotification(error.message);
      await this.slackService.sendMessage(slackData);
      throw new UnprocessableEntityError({
        message: error.message,
        httpCode: error.status,
        verboseMessage: error.statusText,
      });
    }
  };

  private getFailedNotification = (message: string) => {
    return {
      category: 'disbursement',
      event: 'failed',
      data: {
        requestFailedType: 'partner_account_verification_failed',
        id: this.disbursementRequest._id,
        reference: this.disbursementRequest.reference,
        message,
      },
    };
  };
}
