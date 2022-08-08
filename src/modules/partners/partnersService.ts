import { UnprocessableEntityError } from '../../utils/errors/errorHandler';

import { Injectable, Logger } from '@nestjs/common';
import { PartnerData } from './partnersInterface';
import * as Integrations from './partnersList';
import { ResponseHandler } from '../../utils';

@Injectable()
export class partnerService {
  async initiatePartner(params: PartnerData) {
    try {
      const { partnerName, action, data } = params;
      const activePartner = this.getActivePartner(params.partnerName);
      if (!activePartner) {
        const message = `Partner '${partnerName}' not found`;
        throw new UnprocessableEntityError({ message });
      }
      const partnerResponse = await activePartner[action]({
        ...data,
        partnerName,
      });

      return partnerResponse;
    } catch (error: any) {
      console.log('error', error);
      throw new UnprocessableEntityError({
        message: error.message,
        httpCode: error.httpCode,
      });
      // return ResponseHandler('error', 400, true, null);
    }
  }

  private getActivePartner = (partnerName: string) => {
    try {
      const integrations: any = Integrations;
      const channelIntegration = integrations[partnerName];
      return channelIntegration;
    } catch (error) {
      return '';
    }
  };
}
