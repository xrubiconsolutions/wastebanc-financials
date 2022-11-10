import { GenerateVirtualAccountDTO } from './../partners/sterlingBank/sterlingBank.dto';
import { userService } from './users.service';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('/api/users')
export class usersController {
  constructor(private readonly userservice: userService) {}

  @Post('/create/virtualAccount')
  async createVirtualAccount(
    @Body() params: GenerateVirtualAccountDTO,
    @Res() res: Response,
  ) {
    try {
      const result = await this.userservice.openSAFAccount(params);
      return res.status(200).json({
        message: 'Account number generated successfully',
        error: false,
        data: result,
      });
    } catch (error) {
      return res.status(error.httpCode || 50).json({
        message: error.message || 'Error create virtual account number',
        error: true,
      });
    }
  }
}
