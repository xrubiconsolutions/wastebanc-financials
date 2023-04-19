import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
  accountNumberDTO,
  verifyTransactionDTO,
  generateMerchantKeyDTO,
} from './sterlingBank.dto';
import * as sterlingbankService from './sterlingBank.service';

export const createMerchantKey = async (params: generateMerchantKeyDTO) => {
  return await sterlingbankService.generateMerchantKey(params);
};
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
  console.log('params', params);
  const value: any = { ...params };
  delete value.partnerName;
  console.log(value);
  return await sterlingbankService.generateVirtualAccount(value);
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
