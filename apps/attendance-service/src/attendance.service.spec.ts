import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { RpcException } from '@nestjs/microservices';
import { EmployeeSummary, UserRole } from '@dexa/contracts';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceService } from './attendance.service';

function createEmployee(overrides: Partial<EmployeeSummary> = {}): EmployeeSummary {
  return {
    id: 'employee-1',
    authUserId: 'user-1',
    employeeNumber: 'DX-001',
    fullName: 'Dexa Employee',
    email: 'employee@dexa.test',
    department: 'Engineering',
    position: 'Developer',
    phoneNumber: null,
    active: true,
    createdAt: '2026-06-29T08:00:00.000Z',
    updatedAt: '2026-06-29T08:00:00.000Z',
    ...overrides,
  };
}

function createProof(overrides: Partial<{ base64: string; originalFilename: string; mimeType: string; fileSize: number }> = {}) {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
  return {
    base64: bytes.toString('base64'),
    originalFilename: 'proof.png',
    mimeType: 'image/png',
    fileSize: bytes.length,
    ...overrides,
  };
}

function createLocation(overrides: Partial<{ latitude: number; longitude: number; accuracyMeters: number; capturedAt: string }> = {}) {
  return {
    latitude: -6.21462,
    longitude: 106.84513,
    accuracyMeters: 35,
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createRepository(initialRows: AttendanceRecord[] = []) {
  const rows = [...initialRows];

  return {
    rows,
    repository: {
      findOne: async ({ where }: { where: Partial<AttendanceRecord> }) => rows.find((row) => matches(row, where)) ?? null,
      find: async ({ where }: { where: Partial<AttendanceRecord> }) => rows.filter((row) => matches(row, where)),
      findAndCount: async ({
        where,
        skip = 0,
        take = 10,
      }: {
        where: Partial<AttendanceRecord>;
        skip?: number;
        take?: number;
      }) => {
        const filtered = rows.filter((row) => matches(row, where));
        return [filtered.slice(skip, skip + take), filtered.length];
      },
      create: (payload: Partial<AttendanceRecord>) => payload as AttendanceRecord,
      save: async (record: AttendanceRecord) => {
        if (rows.some((row) => row.employeeId === record.employeeId && row.attendanceDate === record.attendanceDate)) {
          const duplicateError = new Error('Duplicate entry') as Error & { code: string };
          duplicateError.code = 'ER_DUP_ENTRY';
          throw duplicateError;
        }

        const now = new Date('2026-06-29T08:00:00.000Z');
        const saved = {
          ...record,
          id: record.id ?? `attendance-${rows.length + 1}`,
          createdAt: record.createdAt ?? now,
          updatedAt: now,
        };
        rows.push(saved);
        return saved;
      },
    },
  };
}

function matches(row: AttendanceRecord, where: Partial<AttendanceRecord>): boolean {
  return Object.entries(where).every(([key, value]) => row[key as keyof AttendanceRecord] === value);
}

function createService(initialRows: AttendanceRecord[] = []) {
  const uploadDir = `/tmp/dexa-attendance-test-${randomUUID()}`;
  process.env.UPLOAD_DIR = uploadDir;
  process.env.MAX_UPLOAD_BYTES = '2097152';
  process.env.APP_TIMEZONE = 'Asia/Jakarta';
  const { repository, rows } = createRepository(initialRows);
  return {
    rows,
    uploadDir,
    service: new AttendanceService(repository as never),
    cleanup: () => rm(uploadDir, { recursive: true, force: true }),
  };
}

function rpcPayload(error: unknown): { statusCode: number; message: string } {
  return (error as RpcException).getError() as { statusCode: number; message: string };
}

test('attendance-service submits attendance with a valid proof photo', async () => {
  const { service, rows, cleanup } = createService();
  try {
    const result = await service.submit({
      authUserId: 'user-1',
      employee: createEmployee(),
      file: createProof(),
      location: createLocation(),
      notes: 'WFH today',
    });

    assert.equal(result.id, 'attendance-1');
    assert.equal(result.employeeId, 'employee-1');
    assert.equal(result.notes, 'WFH today');
    assert.equal(result.latitude, -6.21462);
    assert.equal(result.longitude, 106.84513);
    assert.equal(result.accuracyMeters, 35);
    assert.equal(rows.length, 1);
  } finally {
    await cleanup();
  }
});

test('attendance-service rejects duplicate attendance on the same business date', async () => {
  const { service, cleanup } = createService();
  try {
    const payload = {
      authUserId: 'user-1',
      employee: createEmployee(),
      file: createProof(),
      location: createLocation(),
      notes: null,
    };

    await service.submit(payload);
    await assert.rejects(service.submit(payload), (error) => {
      assert.equal(rpcPayload(error).statusCode, 409);
      return true;
    });
  } finally {
    await cleanup();
  }
});

test('attendance-service rejects inactive employees', async () => {
  const { service, cleanup } = createService();
  try {
    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee({ active: false }),
        file: createProof(),
        location: createLocation(),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 403);
        return true;
      },
    );
  } finally {
    await cleanup();
  }
});

test('attendance-service rejects invalid proof MIME type and oversized uploads', async () => {
  const { service, cleanup } = createService();
  try {
    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee(),
        file: createProof({ originalFilename: 'proof.txt', mimeType: 'text/plain' }),
        location: createLocation(),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 400);
        return true;
      },
    );

    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee(),
        file: createProof({ fileSize: 3_000_000 }),
        location: createLocation(),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 400);
        return true;
      },
    );

    const spoofedBytes = Buffer.from('not-an-image');
    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee(),
        file: createProof({
          base64: spoofedBytes.toString('base64'),
          mimeType: 'image/png',
          fileSize: spoofedBytes.length,
        }),
        location: createLocation(),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 400);
        return true;
      },
    );
  } finally {
    await cleanup();
  }
});

test('attendance-service requires accurate submission location', async () => {
  const { service, cleanup } = createService();
  try {
    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee(),
        file: createProof(),
        location: createLocation({ accuracyMeters: 800 }),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 400);
        return true;
      },
    );

    await assert.rejects(
      service.submit({
        authUserId: 'user-1',
        employee: createEmployee(),
        file: createProof(),
        location: createLocation({ latitude: 120 }),
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 400);
        return true;
      },
    );
  } finally {
    await cleanup();
  }
});

test('attendance-service limits proof access to the owner or HRD admin', async () => {
  const { service, cleanup } = createService();
  try {
    const record = await service.submit({
      authUserId: 'user-1',
      employee: createEmployee(),
      file: createProof(),
      location: createLocation(),
    });

    const ownerProof = await service.getProof({
      id: record.id,
      requesterAuthUserId: 'user-1',
      requesterRole: UserRole.EMPLOYEE,
    });
    assert.equal(ownerProof.mimeType, 'image/png');

    await assert.rejects(
      service.getProof({
        id: record.id,
        requesterAuthUserId: 'other-user',
        requesterRole: UserRole.EMPLOYEE,
      }),
      (error) => {
        assert.equal(rpcPayload(error).statusCode, 403);
        return true;
      },
    );
  } finally {
    await cleanup();
  }
});

test('attendance-service returns a clean not found error when proof file is missing', async () => {
  const { service, rows, uploadDir, cleanup } = createService();
  try {
    const record = await service.submit({
      authUserId: 'user-1',
      employee: createEmployee(),
      file: createProof(),
      location: createLocation(),
    });

    await unlink(path.join(uploadDir, rows[0].proofPath));

    await assert.rejects(
      service.getProof({
        id: record.id,
        requesterAuthUserId: 'user-1',
        requesterRole: UserRole.EMPLOYEE,
      }),
      (error) => {
        const payload = rpcPayload(error);
        assert.equal(payload.statusCode, 404);
        assert.equal(payload.message, 'Proof photo file was not found.');
        return true;
      },
    );
  } finally {
    await cleanup();
  }
});
