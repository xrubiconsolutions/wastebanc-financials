import { SlackCategories } from './../notification/slack/slack.enum';
import {
  CollectorPay,
  CollectorPayDocument,
} from './../schemas/wastepickerPayment.schema';
import { Collector, collectorDocument } from './../schemas/collector.schema';
import { Inject, Injectable } from '@nestjs/common';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from '../schemas/disbursementRequest.schema';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transactions.schema';
import { initiateWastePickerWithdrawalDTO } from './disbursement.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SlackService } from '../notification/slack/slack.service';
import { smsService } from '../notification/sms/sms.service';
import {
  Organisation,
  OrganisationDocument,
} from '../schemas/organisation.schema';
import { partnerService } from '../partners/partnersService';
import {
  DisbursementStatus,
  DisbursementType,
  ProcessingType,
} from './disbursement.enum';
import { env, UnprocessableEntityError } from '../../utils';
import disbursementConfig from './disbursement.config.json';
// import banklists from '../misc/ngnbanklist.json';

@Injectable()
export class wastepickerdisursmentService {
  private params: initiateWastePickerWithdrawalDTO;
  public disbursementRequest: DisbursementRequestDocument | null;
  private transactions: Transaction[] | [];
  private collector: Collector | null;
  public message = '';
  private withdrawalAmount: number;

  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(Collector.name)
    private collectorModel: Model<collectorDocument>,
    private slackService: SlackService,
    private sms_service: smsService,
    @InjectModel(Organisation.name)
    private organisationModel: Model<OrganisationDocument>,
    private partnerservice: partnerService,
    @Inject('moment') private moment: moment.Moment,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(CollectorPay.name)
    private collectorPayModel: Model<CollectorPayDocument>,
  ) {
    this.params = null;
    this.disbursementRequest = null;
    this.collector = null;
    this.transactions = [];
    this.message = '';
    this.withdrawalAmount = 0;
  }

  public async initate(params: initiateWastePickerWithdrawalDTO) {
    this.params = params;
    await this.getDisbursementRequest();
    await this.getCollector();
    //await this.getCollectionTransactions();
    await this.confirmAndDebitAmount();
    await this.storeDisbursement();
    await this.processDisbursement();

    return this.message;
  }

  private getDisbursementRequest = async () => {
    const condition = {
      _id: this.params.requestId,
      otp: this.params.otp,
      collector: this.params.collectorId,
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

  private async getCollector() {
    const collector = await this.collectorModel.findById(
      this.params.collectorId,
    );
    if (!collector)
      throw new UnprocessableEntityError({
        message: 'collector not found',
        verboseMessage: 'collector not found',
      });

    this.collector = collector;
    return this.collector;
  }

  private async getCollectionTransactions() {
    const condition = {
      completedBy: this.collector._id.toString(),
    };
    const transactions = await this.transactionModel.find(condition);
    if (transactions.length <= 0)
      throw new UnprocessableEntityError({
        message: 'Collector has no recent transactions',
        verboseMessage: 'Collector has no recent transactions',
      });
    this.transactions = transactions;
    return this.transactions;
  }

  private async confirmAndDebitAmount() {
    const availablePoints = Number(this.collector.pointGained);
    const min_withdrawalable_amount =
      process.env.SYSTEM_MIN_WITHDRAWALABLE_AMOUNT;

    if (availablePoints <= +min_withdrawalable_amount) {
      throw new UnprocessableEntityError({
        message: 'Insufficient available balance',
        verboseMessage: 'Insufficient available balance',
      });
    }

    const balance = availablePoints - this.disbursementRequest.amount;

    await this.collectorModel.updateOne(
      { _id: this.collector._id },
      {
        pointGained: balance,
        requestedAmount: this.disbursementRequest.withdrawalAmount,
      },
    );

    this.withdrawalAmount = +this.collector.pointGained;
    return balance;
  }

  private async storeDisbursement() {
    await Promise.all(
      this.transactions.map(async (transaction) => {
        await this.storePaymentRequest(transaction);
      }),
    );

    return this.transactions;
  }

  private async storePaymentRequest(transaction: Transaction) {
    return await this.collectorPayModel.create({
      collector: this.collector._id,
      transaction: transaction._id,
      fullname: this.collector.fullname,
      userPhone: this.collector.phone,
      bankAcNo: this.collector.account.accountNo,
      bankName: this.collector.account.bankName,
      organisation: this.collector.organisationId,
      amount: transaction.coin,
      state: transaction.state,
      reference: this.disbursementRequest.reference,
    });
  }

  private async processDisbursement() {
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
  }

  private async processDisbursementManually() {
    const slackData = this.getBankDisbursementSlackNotification();
    this.message =
      'Transaction processing. Payment will be made within 5 working days';
    return this.slackService.sendMessage(slackData);
  }

  private getBankDisbursementSlackNotification() {
    return {
      category: SlackCategories.Disbursement,
      event: DisbursementStatus.initiated,
      data: {
        id: this.disbursementRequest._id,
        type: DisbursementType.bank,
        reference: this.disbursementRequest.referenceCode,
        withdrawalAmount: this.disbursementRequest.withdrawalAmount,
        username: this.collector.fullname,
        collectorAvailablePoint: this.collector.pointGained,
        accountName: this.disbursementRequest.beneName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.destinationAccount,
        charge: process.env.APP_CHARGE,
        message: 'Manual Payment',
        userType: 'wastepicker',
      },
    };
  }

  private async processDisbursementByCompany() {
    return await this.handleCompanySmsNotification();
  }

  private async handleCompanySmsNotification() {
    await Promise.all(
      this.transactions.map(async (transaction: Transaction) => {
        const organisation = await this.organisationModel.findById(
          transaction.organisationID,
        );

        if (organisation) {
          await this.sms_service.sendSms({
            phone: organisation.phone,
            organisationName: organisation.companyName,
            userName: this.collector.fullname,
          });
        }
      }),
    );
    return this.transactions;
  }

  private async processDisbursementAutomatically(partnerName: string) {
    if (
      this.disbursementRequest.bankName.toLowerCase() == 'sterling bank' ||
      this.disbursementRequest.bankName.toLowerCase() == 'sterling'
    ) {
      return this.intraBankTransfer(partnerName);
    }
    return this.nipTransfer(partnerName);
  }

  private async nipTransfer(partnerName: string) {
    console.log(
      'this.disbursementRequest.bankCode',
      this.disbursementRequest.destinationBankCode,
    );

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
      this.message = 'Payout Request Failed';
      return partnerResponse;
    }
    // if (!partnerResponse.success && partnerResponse.httpCode === 403) {
    //   await this.rollBack();
    //   await this.sendPartnerFailedNotification(
    //     partnerName,
    //     partnerResponse.error,
    //     'nipTransfer',
    //   );
    //   this.message = 'Payout Request Failed';
    //   return partnerResponse;
    // }

    // if (!partnerResponse.success) {
    //   await this.rollBack();
    //   await this.sendPartnerFailedNotification(
    //     partnerName,
    //     partnerResponse.error,
    //     'nipTransfer',
    //   );
    //   this.message = 'Payout Request Failed';
    //   return this.message;
    // }

    this.message = 'Payout initiated successfully';
    return this.message;
  }

  private async intraBankTransfer(partnerName: string) {
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
      this.message = 'Payout Request Failed';
      return partnerResponse;
    }
    // if (!partnerResponse.success && partnerResponse.httpCode === 403) {
    //   await this.rollBack();
    //   await this.sendPartnerFailedNotification(
    //     partnerResponse.error,
    //     partnerName,
    //     'intraBankTransfer',
    //   );
    //   // roll back

    //   // const msg = 'Payout Request Failed';
    //   this.message = 'Payout Request Failed';
    //   return partnerResponse;
    // }

    // if (!partnerResponse.success) {
    //   await this.rollBack();
    //   await this.sendPartnerFailedNotification(
    //     partnerName,
    //     partnerResponse.error,
    //     'intraBankTransfer',
    //   );
    //   console.log('err', partnerResponse);
    //   this.message = 'Payout Request Failed';
    //   return partnerResponse;
    // }
    this.message = 'Payout initiated successfully';
    return partnerResponse;
  }
  private async sendPartnerFailedNotification(
    message: string,
    partnerMsg: string,
    parterName: string,
    method: string,
  ) {
    const slackNotificationData = {
      category: 'disbursement',
      event: 'failed',
      data: {
        requestFailedType: 'partner_processing_transaction',
        parterName,
        id: this.disbursementRequest._id,
        reference: this.disbursementRequest.reference,
        amount: this.disbursementRequest.withdrawalAmount,
        username: this.collector.fullname,
        userAvailablePoint: this.collector.pointGained,
        accountName: this.disbursementRequest.beneName,
        accountNumber: this.disbursementRequest.destinationAccount,
        bankCode: this.disbursementRequest.destinationBankCode,
        charge: env('APP_CHARGE'),
        message,
        partnerMsg,
        method,
        userType: 'wastepicker',
      },
    };

    return this.slackService.sendMessage(slackNotificationData);
  }

  private async rollBack() {
    // await Promise.all(
    //   this.transactions.map(async (transaction) => {
    //     await this.collectorPayModel.deleteOne({
    //       transaction: transaction._id,
    //     });
    //   }),
    // );

    await this.collectorModel.updateOne(
      { _id: this.collector._id },
      { pointGained: this.disbursementRequest.amount },
    );
  }
}
