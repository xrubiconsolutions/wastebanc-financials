import { resolveAccountDTO } from './paystack.dto';
import * as payStackService from './paystack.service';
export const bankLists = async () => {
  return await payStackService.getBankList();
};

export const resolveAccount = async (params: resolveAccountDTO) => {
  return await payStackService.verifyAccount(params);
};
