import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
} from './sterlingBank.dto';
import * as sterlingbankService from './sterlingBank.service';

export const bankLists = async () => {
  return await sterlingbankService.BankList();
};

export const resolveAccount = async (params: nipInquiryDTO) => {
  return await sterlingbankService.nipNameInquiry(params);
};

export const getCustomerInformation = async (accountNumber: string) => {
  console.log('con', accountNumber);
  return await sterlingbankService.verifyAccountNumber(accountNumber);
};
export const virtualAccount = async (params: GenerateVirtualAccountDTO) => {
  return await sterlingbankService.generateVirtualAccount(params);
};

export const nipTransfer = async (params: nipTransferDTO) => {
  return await sterlingbankService.nipTransfer(params);
};

export const intraBankTransfer = async (params: intraBankDTO) => {
  return await sterlingbankService.intraBankTransfer(params);
};
