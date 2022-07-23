import axios from 'axios';

export const makeRequest = async (requestObj: any) => {
  requestObj.headers = {
    Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Charset': 'utf-8',
  };
  requestObj.url = `${process.env.PAYSTACK_URL + requestObj.url}`;
  const result = await axios(requestObj);
  return result.data;
};

export const getBankList = async () => {
  const bankList = await makeRequest({
    method: 'get',
    url: 'banks',
  });
  return bankList;
};

export const verifyAccount = async (accountData: any) => {
  const account = await makeRequest({
    method: 'get',
    url: `bank/resolve?account_number=${accountData.accountNumber}&bank_code=${accountData.BankCode}`,
  });

  return account;
};
