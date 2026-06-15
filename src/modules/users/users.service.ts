import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.usersRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      passwordHash: createUserDto.password, // temporary, auth hashing later
    });
    return this.usersRepository.save(user);
  }

  async findAll() {
    const allUsers = await this.usersRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      message: 'Users fetched successfully',
      data: allUsers.map(({ passwordHash, ...user }) => user), // Exclude passwordHash from response
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    Object.assign(user, {
      email: updateUserDto.email ?? user.email,
      fullName: updateUserDto.fullName ?? user.fullName,
    });

    return this.usersRepository.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);

    await this.usersRepository.remove(user);

    return {
      message: 'User deleted successfully',
    };
  }
}
