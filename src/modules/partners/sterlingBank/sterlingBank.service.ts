import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
} from './sterlingBank.dto';
import { UnprocessableEntityError } from '../../../utils/errors/errorHandler';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as sterlingRepository from './sterlingBankRepository';
import 'dotenv/config';

export const BankList = async () => {
  // const encryptResult = await sterlingRepository.getBankList();
  // console.log('enc', encryptResult);
  try {
    const encryptResult = await sterlingRepository.getBankList();
    const bankList: any = decryptData(encryptResult);
    console.log('d', bankList);
    return bankList;
  } catch (error: any) {
    console.log('error sterling', error);
    Logger.error(error);
    handleError(error.response);
  }
};

export const nipNameInquiry = async (params: nipInquiryDTO) => {
  try {
    console.log('sterling', params);
    const inquiryData = getnipNameInquiryRequestData(params);
    console.log('m', inquiryData);
    const encrypParams = encryptData(JSON.stringify(inquiryData));
    const encryptResult = await sterlingRepository.nipAccountNumber(
      encrypParams,
    );
    const result: any = handleDecrypting(encryptResult);
    return {
      account_name: result.data.Data.nameDetails,
      account_number: params.accountNumber,
      neSid: result.data.Data.neSid,
      neresp: result.data.Data.neresp,
      beneBVN: result.data.Data.beneBVN,
      kycLevel: result.data.Data.kycLevel,
    };
  } catch (error: any) {
    console.log(error);
    Logger.error(error);
    handleError(error.response);
  }
};

export const verifyAccountNumber = async (accountNo: string) => {
  try {
    console.log('s', accountNo);
    const encrypAccountNo = encryptData(accountNo);
    const encryptResult = await sterlingRepository.getCustomerInformation(
      encrypAccountNo,
    );
    return handleDecrypting(encryptResult);
  } catch (error) {
    console.log(error);
    Logger.error(error);
    handleError(error.response);
  }
};

export const generateVirtualAccount = async (
  params: GenerateVirtualAccountDTO,
) => {
  try {
    const encryptParams = encryptData(JSON.stringify(params));
    const encryptResult = await sterlingRepository.generateVirtualAccount(
      encryptParams,
    );
    return handleDecrypting(encryptResult);
  } catch (error) {
    console.log('error', error);
    Logger.error(error);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

export const nipTransfer = async (params: nipTransferDTO) => {
  try {
    const encryptParams = encryptData(JSON.stringify(params));
    const encryptResult = await sterlingRepository.nipFundTransfer(
      encryptParams,
    );
    const result = handleDecrypting(encryptResult);
    console.log('result on nip transfer', result);
    return result;
  } catch (error: any) {
    console.log('error', error);
    Logger.error(error);
    return handleError(error.response);
  }
};

export const intraBankTransfer = async (params: intraBankDTO) => {
  try {
    const encryptParams = encryptData(JSON.stringify(params));
    const encryptedResult = await sterlingRepository.intraBank(encryptParams);
    // return handleDecrypting(encryptedResult);
    const result = handleDecrypting(encryptedResult);
    console.log('result on nip transfer', result);
    return result;
  } catch (error) {
    console.log('error', error);
    Logger.error(error);
    // throw new UnprocessableEntityError({ message: error.response.data });
    return handleError(error.response);
  }
};

const handleDecrypting = (params: string) => {
  let decryptedResult: any = decryptData(params);

  if (typeof decryptedResult == 'string') {
    decryptedResult = JSON.parse(decryptedResult);
  }
  return decryptedResult;
};
const getnipNameInquiryRequestData = (params: nipInquiryDTO) => {
  return {
    toAccount: params.accountNumber,
    destinationBankCode: params.BankCode,
    referenceId: params.referenceId,
  };
};
const generateKey = () => {
  return crypto.pbkdf2Sync(
    'Et2347fdrloln95@#qi',
    Buffer.from('Sklqg625*&dltr01r'),
    2,
    32,
    'sha1',
  );
};
const encryptData = (data: string) => {
  const key = generateKey();
  const cipher = crypto.createCipheriv(
    'AES-256-CBC',
    key,
    Buffer.from(process.env.IV),
  );
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return encrypted;
};

const decryptData = (data: string) => {
  const key = generateKey();
  const decipher = crypto.createDecipheriv(
    'AES-256-CBC',
    key,
    Buffer.from(process.env.IV),
  );
  let decrypted = decipher.update(data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const handleError = (response: any) => {
  const { status, statusText, data } = response;

  if (typeof data == 'object') {
    console.log('errors', data.errors);
    throw new UnprocessableEntityError({
      message: data.errors,
      httpCode: status,
      verboseMessage: statusText,
    });
  }
  if (status === 403) {
    console.log('here');
    throw new UnprocessableEntityError({
      message: data,
      httpCode: status,
      verboseMessage: statusText,
    });
  }
  const errorResult: any = handleDecrypting(data);
  console.log('errorResult', errorResult);
  if (status >= 400) {
    throw new UnprocessableEntityError({
      message: errorResult.data || errorResult.Data || errorResult.message,
      httpCode: status,
      verboseMessage: statusText,
    });
  }

  if (errorResult.Description && errorResult.Description === 'Unsuccessful') {
    throw new UnprocessableEntityError({
      message: 'Request was not successfully',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  if (errorResult.responseCode && errorResult.responseCode == '00') {
    console.log('res', 'Your request is been processed 00');
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  if (errorResult.responseCode && errorResult.responseCode == '01') {
    console.log('res', 'Your request is been processed 01');
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  if (errorResult.statusCode && errorResult.statusCode == '0') {
    console.log('res', 'Your request is been processed 0');
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  if (errorResult.statusCode && errorResult.statusCode == '00') {
    console.log(
      'res',
      `Your request is been processed 0 ${errorResult.statusCode}`,
    );
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }
  if (errorResult.statusCode && errorResult.statusCode == '1') {
    console.log(
      'res',
      `Your request is been processed 0 ${errorResult.statusCode}`,
    );
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  if (errorResult.statusCode && errorResult.statusCode == '01') {
    console.log(
      'res',
      `Your request is been processed 0 ${errorResult.statusCode}`,
    );
    throw new UnprocessableEntityError({
      message: 'Your request is been processed',
      httpCode: status,
      verboseMessage: errorResult.Description,
    });
  }

  throw new UnprocessableEntityError({
    message: data,
    httpCode: status,
    verboseMessage: statusText,
  });
};
