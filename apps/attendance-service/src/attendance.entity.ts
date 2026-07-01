import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';

const nullableDecimalTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity('attendance_records')
@Index(['employeeId', 'attendanceDate'], { unique: true })
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'employee_id', length: 36 })
  employeeId!: string;

  @Index()
  @Column({ name: 'auth_user_id', length: 36 })
  authUserId!: string;

  @Index()
  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate!: string;

  @Column({ name: 'submitted_at', type: 'datetime', precision: 3 })
  submittedAt!: Date;

  @Column({ name: 'proof_path', length: 255 })
  proofPath!: string;

  @Column({ name: 'stored_filename', length: 120 })
  storedFilename!: string;

  @Column({ name: 'original_filename', length: 255 })
  originalFilename!: string;

  @Column({ name: 'mime_type', length: 80 })
  mimeType!: string;

  @Column({ name: 'file_size' })
  fileSize!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: nullableDecimalTransformer })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, transformer: nullableDecimalTransformer })
  longitude!: number | null;

  @Column({ name: 'accuracy_meters', type: 'decimal', precision: 8, scale: 2, nullable: true, transformer: nullableDecimalTransformer })
  accuracyMeters!: number | null;

  @Column({ name: 'location_captured_at', type: 'datetime', precision: 3, nullable: true })
  locationCapturedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
