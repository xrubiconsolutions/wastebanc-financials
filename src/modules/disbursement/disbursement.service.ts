import { partnerService } from './../partners/partnersService';
// import { generateReference, env } from './../../utils/misc';
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
import { Inject, Injectable } from '@nestjs/common';
import { CharityOrganisation } from '../schemas/charityorganisation.schema';
import banklists from '../misc/ngnbanklist.json';
import { env } from '../../utils';
@Injectable()
export class DisbursementService {
  private params: InitiateDTO;
  public disbursementRequest: DisbursementRequest | null;
  private transactions: Transaction[] | [];
  private user: User | null;
  public message = '';
  private withdrawalAmount: number;

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
    @Inject('moment') private moment: moment.Moment,
  ) {
    this.params = null;
    this.disbursementRequest = null;
    this.user = null;
    this.transactions = [];
    this.message = '';
    this.withdrawalAmount = 0;
  }

  public initiate = async (params: InitiateDTO) => {
    this.params = params;
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
      status: DisbursementStatus.initiated,
    };
    const disbursementRequest = await this.disbursementModel.findOne(condition);

    console.log('dis', disbursementRequest);
    if (!disbursementRequest)
      throw new UnprocessableEntityError({
        message: 'Invalid Payout request',
        verboseMessage: 'Invalid Payout request',
      });

    const currentDate = this.moment.toDate();
    console.log('now', currentDate);
    if (disbursementRequest.otpExpiry < currentDate) {
      throw new UnprocessableEntityError({
        message: 'OTP has expired',
        verboseMessage: 'OTP has expired',
      });
    }

    this.disbursementRequest = disbursementRequest;
    console.log('d', this.disbursementRequest);
    return this.disbursementRequest;
  };

  private confirmAndDebitAmount = async () => {
    const availablePoints = Number(this.user.availablePoints);
    const min_withdrawalable_amount =
      process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;
    if (availablePoints <= +min_withdrawalable_amount) {
      throw new UnprocessableEntityError({
        message: 'You do not have enough points to complete this transaction',
        verboseMessage:
          'You do not have enough points to complete this transaction',
      });
    }

    if (availablePoints <= +min_withdrawalable_amount) {
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

    //this.withdrawalAmount = +this.user.availablePoints - 100;
    this.withdrawalAmount = +this.user.availablePoints;
    return balance;
  };

  private processDisbursement = async () => {
    if (this.disbursementRequest.type == DisbursementType.charity) {
      await this.processCharityDisbursement();
      return (this.message =
        'Payout has been made to charity organisation account');
    } else {
      return await this.processBankDisbursement();
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
      return this.intraBankTransfer(partnerName);
    }
    return this.nipTransfer(partnerName);
    //return (this.message = 'Payout initiated successfully');
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
        reference: this.disbursementRequest.reference,
        amount: this.withdrawalAmount,
        username: this.user.firstname,
        userAvailablePoint: this.user.availablePoints,
        accountName: this.disbursementRequest.beneName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.bankCode,
        charge: 100,
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
    console.log(
      'this.disbursementRequest.bankCode',
      this.disbursementRequest.destinationBankCode,
    );
    const bank = banklists.find((bank: any) => {
      return this.disbursementRequest.destinationBankCode == bank.value;
    });
    console.log('nip transfer', bank);
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
    if (!partnerResponse.success && partnerResponse.error.httpCode === 403) {
      await this.sendPartnerFailedNotification(
        partnerName,
        partnerResponse.error,
        'nipTransfer',
      );
      // roll back
      await this.rollBack();
      console.log('ger');

      this.message = 'Payout Request Failed';
      return partnerResponse;
    }
    if (!partnerResponse.success) {
      await this.sendPartnerFailedNotification(
        partnerName,
        partnerResponse.error,
        'nipTransfer',
      );
    }
    this.message = 'Payout initiated successfully';
    return this.message;
  };

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

    console.log('partner data', partnerData);
    const partnerResponse = await this.partnerservice.initiatePartner(
      partnerData,
    );
    console.log('partner response', partnerResponse);
    if (!partnerResponse.success && partnerResponse.error.httpCode === 403) {
      await this.sendPartnerFailedNotification(
        partnerName,
        partnerResponse.error,
        'intraBankTransfer',
      );
      // roll back
      await this.rollBack();
      const msg = 'Payout Request Failed';
      this.message = msg;
      return partnerResponse;
    }

    if (!partnerResponse.success) {
      await this.sendPartnerFailedNotification(
        partnerName,
        partnerResponse.error,
        'intraBankTransfer',
      );
      console.log('err', partnerResponse);
      this.message = 'Payout initiated successfully';
    }
    this.message = 'Payout initiated successfully';
    return partnerResponse;
  };

  private sendPartnerFailedNotification = (
    message: string,
    parterName: string,
    method: string,
  ) => {
    const slackNotificationData = {
      category: 'disbursement',
      event: 'failed',
      data: {
        requestFailedType: 'partner_account_verification_failed',
        parterName,
        id: this.disbursementRequest._id,
        reference: this.disbursementRequest.reference,
        amount: this.disbursementRequest.withdrawalAmount,
        username: this.user.firstname,
        userAvailablePoint: this.user.availablePoints,
        accountName: this.disbursementRequest.beneName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.bankCode,
        charge: 100,
        message,
        method,
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  };

  private rollBack = async () => {
    await Promise.all(
      this.transactions.map(async (transaction) => {
        await this.payModel.deleteOne({ transaction: transaction._id });
        await this.transactionModel.updateOne(
          { _id: transaction._id },
          {
            paid: false,
            requestedForPayment: false,
            paymentResolution: '',
          },
        );
        await this.userModel.updateOne(
          { _id: this.user._id },
          { availablePoints: this.user.availablePoints },
        );
      }),
    );
  };
}
