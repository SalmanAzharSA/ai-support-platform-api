import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OrganizationMember,
  OrganizationMemberRole,
} from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationDeletionRequest,
  OrganizationDeletionRequestStatus,
} from './entities/organization-deletion-request.entity.ts';
import { RequestOrganizationDeletionDto } from './dto/src/modules/organizations/dto/request-organization-deletion.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMembersRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationDeletionRequest)
    private readonly organizationDeletionRequestsRepository: Repository<OrganizationDeletionRequest>,
  ) {}

  //CREATE API SERVICE for creating a new organization
  async create(userId: string, createOrganizationDto: CreateOrganizationDto) {
    const organization = this.organizationsRepository.create(
      createOrganizationDto,
    );

    const savedOrganization =
      await this.organizationsRepository.save(organization);

    const ownerMember = this.organizationMembersRepository.create({
      organizationId: savedOrganization.id,
      userId,
      role: OrganizationMemberRole.OWNER,
    });

    await this.organizationMembersRepository.save(ownerMember);

    return {
      message: 'Organization created successfully',
      data: savedOrganization,
    };
  }

  //GET API SERVICE for fetching organizations where the logged-in user is a member
  async findMyOrganizations(userId: string) {
    const memberships = await this.organizationMembersRepository.find({
      where: { userId },
      //   relations: ['organization'],
      relations: { organization: true },
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Organizations fetched successfully',
      data: memberships.map((membership) => ({
        membershipId: membership.id,
        role: membership.role,
        organization: membership.organization,
      })),
    };
  }

  //GET API SERVICE for fetching all organizations
  async findAll() {
    const organizations = await this.organizationsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      message: 'Organizations fetched successfully',
      data: organizations,
    };
  }

  async findOne(id: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      message: 'Organization fetched successfully',
      data: organization,
    };
  }
  async update(
    userId: string,
    organizationId: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ) {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.status === OrganizationStatus.PENDING_DELETION) {
      throw new BadRequestException(
        'Cannot update organization while deletion is scheduled',
      );
    }

    const membership = await this.organizationMembersRepository.findOne({
      where: {
        organizationId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const canUpdate = [
      OrganizationMemberRole.OWNER,
      OrganizationMemberRole.ADMIN,
    ].includes(membership.role);

    if (!canUpdate) {
      throw new ForbiddenException(
        'Only organization owner or admin can update organization',
      );
    }

    await this.organizationsRepository.update(
      organizationId,
      updateOrganizationDto,
    );

    const updatedOrganization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    return {
      message: 'Organization updated successfully',
      data: updatedOrganization,
    };
  }

  async requestDeletion(
    userId: string,
    organizationId: string,
    requestDeletionDto: RequestOrganizationDeletionDto,
  ) {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.status === OrganizationStatus.PENDING_DELETION) {
      throw new BadRequestException(
        'Organization deletion is already scheduled',
      );
    }

    const ownerMembership = await this.organizationMembersRepository.findOne({
      where: {
        organizationId,
        userId,
        role: OrganizationMemberRole.OWNER,
      },
    });

    if (!ownerMembership) {
      throw new ForbiddenException(
        'Only organization owner can request deletion',
      );
    }

    const deletionRequestedAt = new Date();

    const scheduledDeletionAt = new Date(deletionRequestedAt);
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);
    // scheduledDeletionAt.setMinutes(scheduledDeletionAt.getMinutes() + 1);

    organization.status = OrganizationStatus.PENDING_DELETION;
    organization.deletionRequestedAt = deletionRequestedAt;
    organization.scheduledDeletionAt = scheduledDeletionAt;
    organization.deletionRequestedBy = userId;

    await this.organizationsRepository.save(organization);

    const deletionRequest = this.organizationDeletionRequestsRepository.create({
      organizationId,
      requestedById: userId,
      reason: requestDeletionDto.reason,
      deletionRequestedAt,
      scheduledDeletionAt,
      status: OrganizationDeletionRequestStatus.PENDING,
    });

    await this.organizationDeletionRequestsRepository.save(deletionRequest);

    return {
      message: 'Organization deletion scheduled successfully',
      data: {
        organizationId: organization.id,
        status: organization.status,
        deletionRequestedAt,
        scheduledDeletionAt,
        note: 'This organization will be permanently deleted after 30 days unless deletion is cancelled.',
      },
    };
  }

  // This method will be called by a scheduled job to delete organizations that have reached their scheduled deletion date
  async deleteExpiredOrganizations() {
    const now = new Date();

    const organizations = await this.organizationsRepository.find({
      where: {
        status: OrganizationStatus.PENDING_DELETION,
        scheduledDeletionAt: LessThanOrEqual(now),
      },
    });

    if (!organizations.length) {
      return 0;
    }

    for (const organization of organizations) {
      await this.organizationsRepository.delete(organization.id);
    }

    return organizations.length;
  }

  async cancelDeletion(userId: string, organizationId: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.status !== OrganizationStatus.PENDING_DELETION) {
      throw new BadRequestException(
        'Organization is not scheduled for deletion',
      );
    }

    const ownerMembership = await this.organizationMembersRepository.findOne({
      where: {
        organizationId,
        userId,
        role: OrganizationMemberRole.OWNER,
      },
    });

    if (!ownerMembership) {
      throw new ForbiddenException(
        'Only organization owner can cancel deletion',
      );
    }

    organization.status = OrganizationStatus.ACTIVE;
    organization.deletionRequestedAt = null;
    organization.scheduledDeletionAt = null;
    organization.deletionRequestedBy = null;

    await this.organizationsRepository.save(organization);

    await this.organizationDeletionRequestsRepository.update(
      {
        organizationId,
        status: OrganizationDeletionRequestStatus.PENDING,
      },
      {
        status: OrganizationDeletionRequestStatus.CANCELLED,
      },
    );

    return {
      message: 'Organization deletion cancelled successfully',
      data: {
        organizationId: organization.id,
        status: organization.status,
      },
    };
  }
}
