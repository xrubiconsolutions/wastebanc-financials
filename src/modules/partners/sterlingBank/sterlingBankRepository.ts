import axios from 'axios';

export const makeRequest = async (requestObj: any, contentType: any) => {
  requestObj.headers = {
    Channel: process.env.STERLINGCHANNEL,
    Authorization: `${process.env.STERLINGCHANNEL} ${process.env.STERLINGNAME} ${process.env.STERLINGKEY}`,
    'Content-Type': contentType,
  };
  requestObj.url = `${process.env.STERLING_URL + requestObj.url}`;
  console.log('header', requestObj.headers);
  const result = await axios(requestObj);
  return result.data;
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
      value: accountData,
    },
    ['application/json', 'application/json'],
  );
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
      value: transferData,
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
      value: transferData,
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
      value: virtualAccountData,
    },
    'application/json',
  );

  return virtualAccount;
};

export const verifyTransfer = async (transferData: any) => {
  const response = await makeRequest(
    {
      method: 'post',
      url: '/api/Transaction/VerifyTransaction',
      value: transferData,
    },
    'application/json',
  );

  return response;
};
