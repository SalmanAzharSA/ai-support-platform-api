import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from './entities/organization.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OrganizationMember,
  OrganizationMemberRole,
} from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMembersRepository: Repository<OrganizationMember>,
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
  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationsRepository.update(id, updateOrganizationDto);

    const updatedOrganization = await this.organizationsRepository.findOne({
      where: { id },
    });

    return {
      message: 'Organization updated successfully',
      data: updatedOrganization,
    };
  }

  async remove(id: string) {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationsRepository.delete(id);

    return {
      message: 'Organization removed successfully',
    };
  }
}
