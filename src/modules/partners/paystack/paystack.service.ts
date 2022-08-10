import { Logger } from '@nestjs/common';
import { UnprocessableEntityError } from '../../../utils';
import { resolveAccountDTO } from './paystack.dto';
import * as paystackRepository from './paystackRepository';
export const getBankList = async () => {
  try {
    const banks = await paystackRepository.getBankList();
    return banks;
  } catch (error) {
    Logger.error(error);
    throw new UnprocessableEntityError({ message: error.response.data });
  }
};

export const verifyAccount = async (params: resolveAccountDTO) => {
  try {
    const result = await paystackRepository.verifyAccount(params);
    return {
      account_name: result.data.account_name,
      account_number: result.data.account_number,
      neSid: '',
      neresp: '',
      beneBVN: '',
      kycLevel: '',
    };
  } catch (error) {
    console.log(error);
    Logger.error(error);
    const { status, statusText, data } = error.response;
    throw new UnprocessableEntityError({
      message: data,
      httpCode: status,
      verboseMessage: statusText,
    });
  }
};
