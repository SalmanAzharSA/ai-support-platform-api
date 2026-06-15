import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/users.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  // exports: [TypeOrmModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Export UsersService for use in other modules (e.g., AuthModule)
})
export class UsersModule {}
