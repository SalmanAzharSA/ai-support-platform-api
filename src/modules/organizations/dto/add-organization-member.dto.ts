import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

import { OrganizationMemberRole } from '../entities/organization-member.entity';

export class AddOrganizationMemberDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to add as organization member',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    enum: OrganizationMemberRole,
    example: OrganizationMemberRole.MEMBER,
    description: 'Role of the user inside the organization',
  })
  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}
