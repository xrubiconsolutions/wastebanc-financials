import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDTO {
  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  event: string;

  @IsNotEmpty()
  data: any;
}

export class SlackOptionsDTO {
  type?: string;
  fallback?: string;
  pretext?: string;
}

export class SendNotificationDTO extends SendMessageDTO {
  options?: SlackOptionsDTO | undefined;
}
