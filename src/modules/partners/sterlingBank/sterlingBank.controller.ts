import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
  accountNumberDTO,
  verifyTransactionDTO,
} from './sterlingBank.dto';
import * as sterlingbankService from './sterlingBank.service';

export const bankLists = async () => {
  return await sterlingbankService.BankList();
};

export const resolveAccount = async (params: nipInquiryDTO) => {
  return await sterlingbankService.nipNameInquiry(params);
};

export const getCustomerInformation = async (params: accountNumberDTO) => {
  console.log('con', params.accountNumber);
  return await sterlingbankService.verifyAccountNumber(params);
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

export const verifyTransfer = async (params: verifyTransactionDTO) => {
  return await sterlingbankService.verifyTransaction(params);
};
