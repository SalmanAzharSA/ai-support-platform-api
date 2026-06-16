import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrganizationsService } from '../organizations.service';

@Injectable()
export class OrganizationDeletionJob {
  private readonly logger = new Logger(OrganizationDeletionJob.name);

  constructor(private readonly organizationsService: OrganizationsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  //   @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrganizationDeletion() {
    const deletedCount =
      await this.organizationsService.deleteExpiredOrganizations();

    if (deletedCount > 0) {
      this.logger.log(`Deleted ${deletedCount} expired organization(s)`);
    }
  }
}
