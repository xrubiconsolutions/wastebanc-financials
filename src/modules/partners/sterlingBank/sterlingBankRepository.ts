import axios from 'axios';

export const makeRequest = async (requestObj: any) => {
  requestObj.header = {
    Channel: process.env.STERLINGCHANNEL,
    Authorization: `${process.env.STERLINGCHANNEL} ${process.env.STERLINGNAME} ${process.env.STERLINGKEY}`,
    'Content-Type': 'application/json',
  };
  console.log('reque', requestObj);
  requestObj.url = `${process.env.STERLING_URL + requestObj.url}`;
  const result = await axios(requestObj);
  return result.data;
};

export const getBankList = async () => {
  const bankList = await makeRequest({
    method: 'get',
    url: 'Transaction/BankList',
  });
  return bankList;
};

export const nipAccountNumber = async (accountData: any) => {
  const account = await makeRequest({
    method: 'post',
    url: 'Transaction/NIPNameinquiry',
    value: accountData,
  });
  return account;
};

export const getCustomerInformation = async (accountData: any) => {
  const account = await makeRequest({
    method: 'get',
    url: `Transaction/customerInformation/${accountData}`,
  });
  return account;
};

export const nipFundTransfer = async (transferData: any) => {
  const response = await makeRequest({
    method: 'post',
    url: 'Transaction/NIPFundTransfer',
    value: transferData,
  });

  return response;
};

export const intraBank = async (transferData: any) => {
  const response = await makeRequest({
    method: 'post',
    url: 'Transaction/IntraBank',
    value: transferData,
  });

  return response;
};

export const generateVirtualAccount = async (virtualAccountData: any) => {
  const virtualAccount = await makeRequest({
    method: 'post',
    url: 'CreateAccount/OpenAccount',
    value: virtualAccountData,
  });

  return virtualAccount;
};

export const verifyTransfer = async (transferData: any) => {
  const response = await makeRequest({
    method: 'post',
    url: '/api/Transaction/VerifyTransaction',
    value: transferData,
  });

  return response;
};
