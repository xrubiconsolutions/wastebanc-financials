import { ussdAirtelService } from './ussdAirtel.service';
import { ussd9mobileService } from './ussd9mobile.service';
import { ussdGloService } from './ussdGlo.service';
import { ussdValues } from './ussd.dto';
import { ussdService } from './ussd.service';
import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/connect/ussd')
export class ussdController {
  constructor(
    private readonly UssdService: ussdService,
    private readonly UssdGloService: ussdGloService,
    private readonly Ussd9mobileService: ussd9mobileService,
    private UssdAirtelService: ussdAirtelService,
  ) {}

  @Post('/initiate')
  async initateUssd(@Res() res: Response, @Body() params: ussdValues) {
    console.log('body', params);
    const result = await this.UssdService.initate(params);
    return res.status(200).json(result);
  }

  @Post('/payment/datasync')
  async initatePaymentAsync(@Res() res: Response, @Body() params: any) {
    console.log('body', params);
    return res.status(200).json({ ...params });
  }

  @Post('/glo/initiate')
  async initateGloUssd(@Res() res: Response, @Body() params: ussdValues) {
    console.log('glo body', params);
    const result = await this.UssdGloService.initate(params);
    return res.status(200).json(result);
  }

  @Post('/glo/payment/datasync')
  async initateGloPaymentAsync(@Res() res: Response, @Body() params: any) {
    console.log('glo payment body', params);
    return res.status(200).json({ ...params });
  }

  @Post('/airtel/initiate')
  async initateAirtelUssd(@Res() res: Response, @Body() params: ussdValues) {
    console.log('airtel body', params);
    const result = await this.UssdAirtelService.initate(params);
    return res.status(200).json(result);
  }

  @Post('/airtel/payment/datasync')
  async initateAirtelPaymentAsync(@Res() res: Response, @Body() params: any) {
    console.log('airtel payment body', params);
    return res.status(200).json({ ...params });
  }

  @Post('/9mobile/initate')
  async initate9MobileUssd(@Res() res: Response, @Body() params: ussdValues) {
    console.log('9 mobile body', params);
    const result = await this.Ussd9mobileService.initate(params);
    return res.status(200).json(result);
  }

  @Post('/9mobile/payment/datasync')
  async initate9MobilePaymentAsync(@Res() res: Response, @Body() params: any) {
    console.log('9mobile payment body', params);
    return res.status(200).json({ ...params });
  }
}
