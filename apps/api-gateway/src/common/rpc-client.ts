import { GatewayTimeoutException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, timeout } from 'rxjs';

const RPC_TIMEOUT_MS = 5000;

export async function sendRpc<TResponse>(client: ClientProxy, pattern: string, payload: unknown): Promise<TResponse> {
  return firstValueFrom(
    client.send<TResponse>(pattern, payload).pipe(
      timeout(RPC_TIMEOUT_MS),
      catchError((error: unknown) => {
        throw mapRpcError(error);
      }),
    ),
  );
}

function mapRpcError(error: unknown): HttpException {
  if (isTimeout(error)) {
    return new GatewayTimeoutException('Internal service did not respond in time.');
  }

  const details = extractErrorDetails(error);
  if (details.statusCode >= 400 && details.statusCode < 600) {
    return new HttpException({ message: details.message }, details.statusCode);
  }

  return new InternalServerErrorException(details.message || 'Internal service error.');
}

function isTimeout(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name?: string }).name === 'TimeoutError';
}

function extractErrorDetails(error: unknown): { statusCode: number; message: string } {
  const candidate = normalizeErrorPayload(error);
  const statusCode = Number(candidate.statusCode ?? candidate.status ?? 500);
  const rawMessage = candidate.message ?? 'Internal service error.';
  const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);

  return { statusCode, message };
}

function normalizeErrorPayload(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) {
    return { message: String(error) };
  }

  const asRecord = error as Record<string, unknown>;
  if (typeof asRecord.response === 'object' && asRecord.response !== null) {
    return asRecord.response as Record<string, unknown>;
  }

  if (typeof asRecord.error === 'object' && asRecord.error !== null) {
    return asRecord.error as Record<string, unknown>;
  }

  return asRecord;
}
