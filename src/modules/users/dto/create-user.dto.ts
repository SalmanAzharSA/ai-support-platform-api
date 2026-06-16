import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name of the user',
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
