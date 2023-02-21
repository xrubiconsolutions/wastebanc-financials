import { userService } from './users.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GenerateVirtualAccountDTO } from '../partners/sterlingBank/sterlingBank.dto';

@Controller('/api')
export class userController {
  constructor(private readonly userservice: userService) {}

  @Post('/generate/saf/accountNumber')
  async generateAccountNumber(
    @Body() params: GenerateVirtualAccountDTO,
    @Res() res: Response,
  ) {
    try {
      const result = await this.userservice.openSAFAccount(params);
      return res.status(200).json(result);
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: 'Error occurred',
        error: true,
      });
    }
  }
}
