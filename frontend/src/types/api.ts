export type UserRole = 'EMPLOYEE' | 'HRD_ADMIN';

export type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  user: PublicUser;
};

export type CsrfResponse = {
  csrfToken: string;
};

export type EmployeeSummary = {
  id: string;
  authUserId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  phoneNumber: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<TData> = {
  data: TData[];
  meta: PaginationMeta;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type AttendanceLocationInput = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export type AttendanceSummary = {
  id: string;
  employeeId: string;
  authUserId: string;
  attendanceDate: string;
  submittedAt: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  locationCapturedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceWithEmployee = AttendanceSummary & {
  employee: EmployeeSummary | null;
};

export type CreateEmployeeInput = {
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  phoneNumber?: string;
  password: string;
};

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'password'>>;
