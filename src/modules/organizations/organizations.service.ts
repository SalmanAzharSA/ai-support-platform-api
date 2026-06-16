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
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';

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
  //UPDATE API SERVICE for updating organization details, only owner or admin can update organization details, cannot update organization that is scheduled for deletion
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
  //Delete organization, only owner can delete organization, deletion will be scheduled and organization will be deleted after 30 days, during this period organization status will be set to pending_deletion and members cannot perform any actions on the organization, owner can also cancel deletion during this period
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
  //Cancel organization deletion, only owner can cancel deletion and only if organization is currently scheduled for deletion
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
  //Add a member to organization, only owner or admin can add members, cannot add members to an organization that is scheduled for deletion
  async addMember(
    requesterId: string,
    organizationId: string,
    addMemberDto: AddOrganizationMemberDto,
  ) {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.status === OrganizationStatus.PENDING_DELETION) {
      throw new BadRequestException(
        'Cannot add members while organization deletion is scheduled',
      );
    }

    const requesterMembership = await this.getMembershipOrFail(
      requesterId,
      organizationId,
    );

    this.ensureOwnerOrAdmin(requesterMembership.role);

    const existingMember = await this.organizationMembersRepository.findOne({
      where: {
        organizationId,
        userId: addMemberDto.userId,
      },
    });

    if (existingMember) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    const member = this.organizationMembersRepository.create({
      organizationId,
      userId: addMemberDto.userId,
      role: addMemberDto.role,
    });

    const savedMember = await this.organizationMembersRepository.save(member);

    return {
      message: 'Organization member added successfully',
      data: savedMember,
    };
  }

  private async getMembershipOrFail(userId: string, organizationId: string) {
    const membership = await this.organizationMembersRepository.findOne({
      where: {
        userId,
        organizationId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return membership;
  }

  private ensureOwnerOrAdmin(role: OrganizationMemberRole) {
    const allowedRoles = [
      OrganizationMemberRole.OWNER,
      OrganizationMemberRole.ADMIN,
    ];

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException(
        'Only organization owner or admin can perform this action',
      );
    }
  }
  //Fetch members of an organization, only members can fetch the list of members
  async findMembers(requesterId: string, organizationId: string) {
    await this.getMembershipOrFail(requesterId, organizationId);

    const members = await this.organizationMembersRepository.find({
      where: { organizationId },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return {
      message: 'Organization members fetched successfully',
      data: members,
    };
  }
  //Update member role, only owner can update member roles
  async updateMemberRole(
    requesterId: string,
    organizationId: string,
    memberId: string,
    updateRoleDto: UpdateOrganizationMemberRoleDto,
  ) {
    const requesterMembership = await this.getMembershipOrFail(
      requesterId,
      organizationId,
    );

    if (requesterMembership.role !== OrganizationMemberRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owner can update member roles',
      );
    }

    const member = await this.organizationMembersRepository.findOne({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    member.role = updateRoleDto.role;

    const updatedMember = await this.organizationMembersRepository.save(member);

    return {
      message: 'Organization member role updated successfully',
      data: updatedMember,
    };
  }

  //Remove member from organization, only owner or admin can remove members, owner cannot remove himself
  async removeMember(
    requesterId: string,
    organizationId: string,
    memberId: string,
  ) {
    const requesterMembership = await this.getMembershipOrFail(
      requesterId,
      organizationId,
    );

    this.ensureOwnerOrAdmin(requesterMembership.role);

    const member = await this.organizationMembersRepository.findOne({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    if (
      member.role === OrganizationMemberRole.OWNER &&
      member.userId === requesterId
    ) {
      throw new BadRequestException('Owner cannot remove himself');
    }

    await this.organizationMembersRepository.delete(member.id);

    return {
      message: 'Organization member removed successfully',
    };
  }
}
