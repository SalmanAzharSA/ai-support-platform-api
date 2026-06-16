import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrganizationMember } from './entities/organization-member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationDeletionRequest } from './entities/organization-deletion-request.entity.ts';
import { OrganizationDeletionJob } from './jobs/organization-deletion.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationDeletionRequest,
    ]),
  ],
  providers: [OrganizationsService, OrganizationDeletionJob],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
