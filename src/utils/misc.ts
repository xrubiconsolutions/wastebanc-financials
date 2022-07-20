import { InternalServerError } from './errors';
import { Logger } from '@nestjs/common';
export const env = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    const envErrorMessage = `Missing: process.env['${name}'].`;
    Logger.error(envErrorMessage);
    throw new InternalServerError({
      message: envErrorMessage,
      verboseMessage: value,
    });
  }

  return value;
};

export const ResponseHandler = (
  message: string,
  code: number,
  error: boolean,
  data: any,
) => {
  return {
    message,
    statusCode: code,
    error,
    data,
  };
};

export const generateReference = (size = 4, alpha = true) => {
  const pool =
    alpha == true
      ? 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789abcdefghijklmnpqrstuvwxyz'
      : '0123456789';
  const rands = [];
  let i = -1;

  while (++i < size)
    rands.push(pool.charAt(Math.floor(Math.random() * pool.length)));

  return rands.join('');
};
