import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { User } from '../../users/entities/users.entity';

export enum OrganizationDeletionRequestStatus {
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('organization_deletion_requests')
export class OrganizationDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  organizationId: string;

  @Index()
  @Column()
  requestedById: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({
    type: 'enum',
    enum: OrganizationDeletionRequestStatus,
    default: OrganizationDeletionRequestStatus.PENDING,
  })
  status: OrganizationDeletionRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  deletionRequestedAt: Date;

  @Column()
  scheduledDeletionAt: Date;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;
}
