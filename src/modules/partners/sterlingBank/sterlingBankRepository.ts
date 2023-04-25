import axios from 'axios';

export const makeRequest = async (requestObj: any, contentType: any) => {
  requestObj.headers = {
    Channel: process.env.STERLINGCHANNEL,
    Authorization: `${process.env.STERLINGCHANNEL} ${process.env.STERLINGNAME} ${process.env.STERLINGKEY}`,
    'Content-Type': contentType,
  };
  requestObj.url = `${process.env.STERLING_URL + requestObj.url}`;
  //console.log('header', requestObj.headers);
  const result = await axios(requestObj);
  return result.data;
};

export const generateMerchantKey = async (data: any) => {
  const account = await makeRequest(
    {
      method: 'post',
      url: 'Transaction/GenerateMerchantKey',
      data,
    },
    'application/json',
  );

  console.log('account', account);
  return account;
};

export const getBankList = async () => {
  const bankList = await makeRequest(
    {
      method: 'get',
      url: 'Transaction/BankList',
    },
    'text/plain; charset=utf-8',
  );
  console.log('sterling result', bankList);
  return bankList;
};

export const nipAccountNumber = async (accountData: any) => {
  const account = await makeRequest(
    {
      method: 'post',
      url: 'Transaction/NIPNameinquiry',
      data: { value: accountData },
    },
    'application/json',
  );
  console.log('account', account);
  return account;
};

//update
export const getCustomerInformation = async (accountData: any) => {
  const account = await makeRequest(
    {
      method: 'get',
      url: `Transaction/customerInformation/${accountData}`,
    },
    'text/plain; charset=utf-8',
  );
  return account;
};

export const nipFundTransfer = async (transferData: any) => {
  const response = await makeRequest(
    {
      method: 'post',
      url: 'Transaction/NIPFundTransfer',
      data: { value: transferData },
    },
    'application/json',
  );

  return response;
};

export const intraBank = async (transferData: any) => {
  const response = await makeRequest(
    {
      method: 'post',
      url: 'Transaction/IntraBank',
      data: { value: transferData },
    },
    'application/json',
  );

  return response;
};

export const generateVirtualAccount = async (virtualAccountData: any) => {
  const virtualAccount = await makeRequest(
    {
      method: 'post',
      url: 'CreateAccount/OpenAccount',
      data: { value: virtualAccountData },
    },
    'application/json',
  );

  return virtualAccount;
};

export const verifyTransfer = async (transferData: any) => {
  const response = await makeRequest(
    {
      method: 'post',
      url: 'Transaction/VerifyTransaction',
      data: { value: transferData },
    },
    'application/json',
  );

  return response;
};

export const fundPayoutAccount = async (data: any) => {
  const response = await makeRequest(
    {
      method: 'post',
      url: 'CreateAccount/WastBancCollection',
      data: { value: data },
    },
    'application/json',
  );
  return response;
};
