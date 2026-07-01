import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'auth_user_id', length: 36 })
  authUserId!: string;

  @Index({ unique: true })
  @Column({ name: 'employee_number', length: 40 })
  employeeNumber!: string;

  @Column({ name: 'full_name', length: 160 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ length: 191 })
  email!: string;

  @Column({ length: 120 })
  department!: string;

  @Column({ length: 120 })
  position!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 40, nullable: true })
  phoneNumber!: string | null;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
