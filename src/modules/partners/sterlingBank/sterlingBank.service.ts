import { ResponseHandler, generateReference } from './../../../utils';
import {
  nipInquiryDTO,
  GenerateVirtualAccountDTO,
  nipTransferDTO,
  intraBankDTO,
} from './sterlingBank.dto';
import { UnprocessableEntityError } from '../../../utils/errors/errorHandler';
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as sterlingRepository from './sterlingBankRepository';

export const BankList = async () => {
  try {
    const encryptResult = await sterlingRepository.getBankList();
    const bankList = decryptData(encryptResult);
    return bankList;
  } catch (error: any) {
    Logger.error(error.response.statusText);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

export const nipNameInquiry = async (params: nipInquiryDTO) => {
  try {
    const inquiryData = getnipNameInquiryRequestData(params);
    const encrypParams = encryptData(JSON.stringify(inquiryData));
    const encryptResult = await sterlingRepository.nipAccountNumber(
      encrypParams,
    );
    return handleDecrypting(encryptResult);
  } catch (error) {
    Logger.error(error.response.statusText);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

export const verifyAccountNumber = async (accountNo: string) => {
  try {
    const encrypAccountNo = encryptData(JSON.stringify(accountNo));
    const encryptResult = await sterlingRepository.getCustomerInformation(
      encrypAccountNo,
    );
    return handleDecrypting(encryptResult);
  } catch (error) {
    Logger.error(error.response.statusText);
    throw new UnprocessableEntityError({ message: error.response.data });
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
    return handleDecrypting(encryptResult);
  } catch (error) {
    console.log('error', error);
    Logger.error(error);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

export const intraBankTransfer = async (params: intraBankDTO) => {
  try {
    const encryptParams = encryptData(JSON.stringify(params));
    const encryptedResult = await sterlingRepository.intraBank(encryptParams);
    return handleDecrypting(encryptedResult);
  } catch (error) {
    console.log('error', error);
    Logger.error(error);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

const handleDecrypting = (params: string) => {
  let decryptedResult = decryptData(params);

  if (typeof decryptedResult == 'string') {
    decryptedResult = JSON.parse(decryptedResult);
  }
  return ResponseHandler('success', 200, false, decryptedResult);
};
const getnipNameInquiryRequestData = (params: nipInquiryDTO) => {
  return {
    toAccount: params.BankCode,
    BankCode: params.BankCode,
    referenceId: generateReference(),
  };
};
const generateKey = () => {
  return crypto.pbkdf2Sync(
    process.env.PASSPHASE,
    Buffer.from(process.env.SALT),
    +process.env.ITERATIONS,
    +process.env.KEYSIZE,
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
// @Injectable()
// export class sterlingBankService {
//   private salt: Buffer;
//   private iv: Buffer;
//   private passPhrase: string;
//   private keySize: number;
//   private iterations: number;
//   private algo: string;
//   constructor() {
//     this.salt = Buffer.from(process.env.SALT);
//     this.iv = Buffer.from(process.env.IV);
//     this.passPhrase = process.env.PASSPHASE;
//     this.keySize = +process.env.KEYSIZE;
//     this.iterations = +process.env.ITERATIONS;
//     this.algo = 'sha1';
//   }

//   async BankList() {
//     try {
//       const encryptResult = await sterlingRepository.getBankList();
//       const bankList = this.decryptData(encryptResult);
//       return bankList;
//     } catch (error: any) {
//       Logger.error(error.response.statusText);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   async nipNameInquiry(params: nipInquiryDTO) {
//     try {
//       const inquiryData = this.getnipNameInquiryRequestData(params);
//       const encrypParams = this.encryptData(JSON.stringify(inquiryData));
//       const encryptResult = await sterlingRepository.nipAccountNumber(
//         encrypParams,
//       );
//       return this.handleDecrypting(encryptResult);
//     } catch (error) {
//       Logger.error(error.response.statusText);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   async verifyAccountNumber(accountNo: string) {
//     try {
//       const encrypAccountNo = this.encryptData(JSON.stringify(accountNo));
//       const encryptResult = await sterlingRepository.getCustomerInformation(
//         encrypAccountNo,
//       );
//       return this.handleDecrypting(encryptResult);
//     } catch (error) {
//       Logger.error(error.response.statusText);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   async generateVirtualAccount(params: GenerateVirtualAccountDTO) {
//     try {
//       const encryptParams = this.encryptData(JSON.stringify(params));
//       const encryptResult = await sterlingRepository.generateVirtualAccount(
//         encryptParams,
//       );
//       return this.handleDecrypting(encryptResult);
//     } catch (error) {
//       console.log('error', error);
//       Logger.error(error);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   async nipTransfer(params: nipTransferDTO) {
//     try {
//       const encryptParams = this.encryptData(JSON.stringify(params));
//       const encryptResult = await sterlingRepository.nipFundTransfer(
//         encryptParams,
//       );
//       return this.handleDecrypting(encryptResult);
//     } catch (error) {
//       console.log('error', error);
//       Logger.error(error);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   async intraBankTransfer(params: intraBankDTO) {
//     try {
//       const encryptParams = this.encryptData(JSON.stringify(params));
//       const encryptedResult = await sterlingRepository.intraBank(encryptParams);
//       return this.handleDecrypting(encryptedResult);
//     } catch (error) {
//       console.log('error', error);
//       Logger.error(error);
//       throw new UnprocessableEntityError({ message: error.response.data });
//     }
//   }

//   private handleDecrypting(params: string) {
//     let decryptedResult = this.decryptData(params);

//     if (typeof decryptedResult == 'string') {
//       decryptedResult = JSON.parse(decryptedResult);
//     }
//     return ResponseHandler('success', 200, false, decryptedResult);
//   }
//   private getnipNameInquiryRequestData(params: nipInquiryDTO) {
//     return {
//       toAccount: params.BankCode,
//       BankCode: params.BankCode,
//       referenceId: generateReference(),
//     };
//   }
//   private generateKey() {
//     return crypto.pbkdf2Sync(
//       this.passPhrase,
//       this.salt,
//       this.iterations,
//       this.keySize,
//       this.algo,
//     );
//   }
//   private encryptData(data: string) {
//     const key = this.generateKey();
//     const cipher = crypto.createCipheriv('AES-256-CBC', key, this.iv);
//     let encrypted = cipher.update(data, 'utf8', 'base64');
//     encrypted += cipher.final('base64');

//     return encrypted;
//   }

//   private decryptData(data: string) {
//     const key = this.generateKey();
//     const decipher = crypto.createDecipheriv('AES-256-CBC', key, this.iv);
//     let decrypted = decipher.update(data, 'base64', 'utf8');
//     decrypted += decipher.final('utf8');
//     return decrypted;
//   }
// }
