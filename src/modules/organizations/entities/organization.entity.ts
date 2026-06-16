import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { OrganizationMember } from './organization-member.entity';

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_DELETION = 'pending_deletion',
  DELETED = 'deleted',
}
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: false })
  name: string;

  @Column({ nullable: true })
  description?: string;

  //   @Column({ default: true })
  //   isActive: boolean;
  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ nullable: true })
  deletionRequestedAt?: Date;

  @Column({ nullable: true })
  scheduledDeletionAt?: Date;

  @Column({ nullable: true })
  deletionRequestedBy?: string;

  @OneToMany(() => OrganizationMember, (member) => member.organization)
  members: OrganizationMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  location: string;
}
