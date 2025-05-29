import { Controller, Logger } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController
{
    private readonly logger = new Logger(UserController.name);

    constructor(private readonly userService: UserService)
    {
        this.logger.debug('UserController initialized', 'UserController#constructor');
    }
}
