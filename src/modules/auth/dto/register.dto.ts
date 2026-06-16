import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// register user wiht otp verification, will be added later, for now just create user with email and password
export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    example: 'StrongPassword123',
    description: 'User password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
