import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { OrganizationMemberRole } from '../entities/organization-member.entity';

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({
    enum: OrganizationMemberRole,
    example: OrganizationMemberRole.ADMIN,
    description: 'New role for organization member',
  })
  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}
