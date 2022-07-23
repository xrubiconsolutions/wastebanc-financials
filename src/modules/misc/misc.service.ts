import { Injectable, Logger } from '@nestjs/common';
import { ResponseHandler } from '../../utils';
import banklist from './ngnbanklist.json';

@Injectable()
export class MiscService {
  async banklist() {
    try {
      const results: any = [];
      banklist.map((bank: any) => {
        results.push({ name: bank.name, value: bank.value });
      });
      return ResponseHandler('success', 200, false, results);
    } catch (error) {
      Logger.error(error);
      return ResponseHandler('An error occurred', 500, true, null);
    }
  }
}
