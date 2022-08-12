import { UnprocessableEntityError } from '../../utils/errors/errorHandler';

import { Injectable, Logger } from '@nestjs/common';
import { PartnerData } from './partnersInterface';
import * as Integrations from './partnersList';

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
      console.log('p', partnerResponse);

      return { success: true, error: null, partnerResponse };
    } catch (error: any) {
      console.log('error', error);
      Logger.error(error);
      return { success: false, error: error || error.message };
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
