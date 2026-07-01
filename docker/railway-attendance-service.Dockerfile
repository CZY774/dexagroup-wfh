# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json
COPY apps/employee-service/package.json ./apps/employee-service/package.json
COPY apps/attendance-service/package.json ./apps/attendance-service/package.json
COPY apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY frontend/package.json ./frontend/package.json

RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=120000

COPY docker ./docker
COPY packages ./packages
COPY apps ./apps
COPY frontend ./frontend

RUN npm run build -w @dexa/contracts
RUN npm run build -w @dexa/attendance-service

CMD npm run start:prod -w @dexa/attendance-service
