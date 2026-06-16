import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestOrganizationDeletionDto {
  @ApiPropertyOptional({
    example: 'No longer using this workspace',
    description: 'Optional reason for requesting organization deletion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
