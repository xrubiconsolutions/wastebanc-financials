import { UnprocessableEntityError } from './../../utils/errors/errorHandler';
import { DisbursementStatus } from './disbursement.enum';
import { Inject, Injectable } from '@nestjs/common';
import {
  DisbursementRequest,
  DisbursementRequestDocument,
} from '../schemas/disbursementRequest.schema';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transactions.schema';
import { InitiateSAFDTO } from './disbursement.dto';
import { partnerService } from './../partners/partnersService';
import {
  Organisation,
  OrganisationDocument,
} from './../schemas/organisation.schema';
import { SlackCategories } from './../notification/slack/slack.enum';
import { SlackService } from './../notification/slack/slack.service';
import { Pay, PayDocument } from '../schemas/payment.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class SAFDisbursementService {
  private params: InitiateSAFDTO;
  public disbursementRequest: DisbursementRequest | null;
  private transactions: Transaction[] | [];
  private user: User | null;
  public message = '';
  private withdrawaalAmount: number;

  constructor(
    @InjectModel(DisbursementRequest.name)
    private disbursementModel: Model<DisbursementRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Pay.name) private payModel: Model<PayDocument>,
    private slackService: SlackService,
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
    this.withdrawaalAmount = 0;
  }

  public initiate(params: InitiateSAFDTO) {
    this.params = params;
  }

  private async getDisbursementRequest() {
    const condition = {
      otp: this.params.otp,
      user: this.params.userId,
      status: DisbursementStatus.initiated,
    };

    const disbursementRequest = await this.disbursementModel.findOne(condition);
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
  }
}
