import { User } from 'src/modules/users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  In,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum OrganizationMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  AGENT = 'agent',
  MEMBER = 'member',
}

@Entity('organization_members')
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  organizationId: string;

  @Index()
  @Column({ unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.MEMBER,
  })
  role: OrganizationMemberRole;

  @ManyToOne(() => Organization, (organization) => organization.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
