export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  HRD_ADMIN = 'HRD_ADMIN',
}

export type JwtPrincipal = {
  sub: string;
  email: string;
  role: UserRole;
};

export type PublicUser = {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

export type PaginationInput = {
  page: number;
  limit: number;
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

export type LoginResult = {
  accessToken: string;
  user: PublicUser;
};

export type ProofFileResult = {
  filename: string;
  originalFilename: string;
  mimeType: string;
  base64: string;
};

export const AUTH_PATTERNS = {
  LOGIN: 'auth.login',
  ME: 'auth.me',
  CREATE_EMPLOYEE_USER: 'auth.createEmployeeUser',
  UPDATE_USER_EMAIL: 'auth.updateUserEmail',
  SET_USER_ACTIVE: 'auth.setUserActive',
} as const;

export const EMPLOYEE_PATTERNS = {
  CREATE: 'employee.create',
  LIST: 'employee.list',
  GET_BY_ID: 'employee.getById',
  GET_BY_AUTH_USER_ID: 'employee.getByAuthUserId',
  UPDATE: 'employee.update',
  DEACTIVATE: 'employee.deactivate',
  ACTIVATE: 'employee.activate',
  LIST_BY_IDS: 'employee.listByIds',
} as const;

export const ATTENDANCE_PATTERNS = {
  SUBMIT: 'attendance.submit',
  LIST_MINE: 'attendance.listMine',
  LIST_ALL: 'attendance.listAll',
  GET_PROOF: 'attendance.getProof',
} as const;

export const SERVICE_CLIENTS = {
  AUTH: 'AUTH_SERVICE_CLIENT',
  EMPLOYEE: 'EMPLOYEE_SERVICE_CLIENT',
  ATTENDANCE: 'ATTENDANCE_SERVICE_CLIENT',
} as const;

export const LOCAL_DEVELOPMENT_JWT_SECRET = 'replace-with-a-long-random-secret';

export function resolveJwtSecret(environment: Record<string, string | undefined>): string {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  const secret = environment.JWT_SECRET?.trim();

  if (!secret) {
    if (nodeEnv === 'production') {
      throw new Error('JWT_SECRET is required in production.');
    }

    return LOCAL_DEVELOPMENT_JWT_SECRET;
  }

  if (nodeEnv === 'production' && secret === LOCAL_DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET must not use the local development placeholder in production.');
  }

  return secret;
}

export const ALLOWED_PROOF_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProofImageMimeType = (typeof ALLOWED_PROOF_IMAGE_MIME_TYPES)[number];

export function detectProofImageMimeType(bytes: Uint8Array): ProofImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
