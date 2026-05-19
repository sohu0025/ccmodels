import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { AuthService } from '../auth/auth.service';

jest.mock('@prisma/client', () => {
  const mock = {
    usageRecord: { upsert: jest.fn(), deleteMany: jest.fn() },
    session: { upsert: jest.fn(), deleteMany: jest.fn() },
    sessionMessage: { upsert: jest.fn(), deleteMany: jest.fn() },
    speedTest: { create: jest.fn(), deleteMany: jest.fn() },
    budgetAlert: { upsert: jest.fn() },
    userProvider: { upsert: jest.fn(), deleteMany: jest.fn() },
    compareTest: { upsert: jest.fn(), deleteMany: jest.fn() },
    recommendation: { upsert: jest.fn(), deleteMany: jest.fn() },
    syncLog: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  (global as any).__mockSyncPrisma = mock;
  return { PrismaClient: jest.fn(() => mock) };
});

// Create fresh mock for each test file load
function createMockAuthService() {
  return { validateToken: jest.fn().mockResolvedValue({ userId: 'user-1' }) };
}

jest.mock('../auth/auth.service', () => ({
  AuthService: jest.fn(() => (global as any).__mockSyncAuth),
}));

describe('SyncController', () => {
  let controller: SyncController;
  let mockPrisma: any;
  let mockAuth: any;

  beforeEach(async () => {
    mockAuth = createMockAuthService();
    (global as any).__mockSyncAuth = mockAuth;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        { provide: AuthService, useValue: mockAuth },
      ],
    }).overrideProvider(AuthService).useValue(mockAuth).compile();

    controller = module.get<SyncController>(SyncController);
    mockPrisma = (global as any).__mockSyncPrisma;
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('push', () => {
    it('should reject unauthorized requests', async () => {
      mockAuth.validateToken.mockResolvedValue(null);

      await expect(controller.push('Bearer invalid', [])).rejects.toThrow(HttpException);
    });

    it('should process usage_records with upsert', async () => {
      const items = [{
        tableName: 'usage_records',
        recordId: 'u1',
        action: 'create',
        payload: {
          id: 'u1',
          providerId: 'p1',
          providerName: 'Test',
          modelId: 'm1',
          promptTokens: 100,
          completionTokens: 50,
          cacheHitTokens: 0,
          cost: 0.001,
          cliTool: 'claude-code',
          sessionId: null,
          timestamp: '2026-05-20T10:00:00Z',
        },
      }];

      const result = await controller.push('Bearer token', items);
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'u1' },
        create: expect.objectContaining({ id: 'u1', providerId: 'p1' }),
        update: expect.objectContaining({ providerId: 'p1' }),
      });
      expect(mockPrisma.syncLog.create).toHaveBeenCalled();
    });

    it('should process sessions with upsert', async () => {
      const items = [{
        tableName: 'sessions',
        recordId: 's1',
        action: 'create',
        payload: {
          id: 's1',
          cliTool: 'claude-code',
          providerId: 'p1',
          providerName: 'Test',
          modelId: 'm1',
          summary: 'Test session',
          messageCount: 5,
          totalTokens: 1000,
          totalCost: 0.01,
          startedAt: '2026-05-20T10:00:00Z',
        },
      }];

      const result = await controller.push('Bearer token', items);
      expect(result.success).toBe(true);
      expect(mockPrisma.session.upsert).toHaveBeenCalledWith({
        where: { id: 's1' },
        create: expect.objectContaining({ id: 's1' }),
        update: expect.objectContaining({ cliTool: 'claude-code' }),
      });
    });

    it('should process compare_tests with upsert', async () => {
      const items = [{
        tableName: 'compare_tests',
        recordId: 'c1',
        action: 'create',
        payload: {
          id: 'c1',
          prompt: 'Test prompt',
          models: '["m1","m2"]',
          responses: '[]',
          status: 'pending',
        },
      }];

      const result = await controller.push('Bearer token', items);
      expect(result.success).toBe(true);
      expect(mockPrisma.compareTest.upsert).toHaveBeenCalled();
    });

    it('should handle mixed table types in single batch', async () => {
      const items = [
        { tableName: 'usage_records', recordId: 'u1', action: 'create', payload: { id: 'u1', providerId: 'p1', modelId: 'm1', promptTokens: 0, completionTokens: 0, cacheHitTokens: 0, cost: 0, cliTool: '', sessionId: null, timestamp: new Date().toISOString(), providerName: '' } },
        { tableName: 'sessions', recordId: 's1', action: 'create', payload: { id: 's1', cliTool: '', providerId: '', providerName: '', modelId: '', summary: '', messageCount: 0, totalTokens: 0, totalCost: 0, startedAt: new Date().toISOString() } },
      ];

      const result = await controller.push('Bearer token', items);
      expect(result.processed).toBe(2);
      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalled();
      expect(mockPrisma.session.upsert).toHaveBeenCalled();
    });
  });
});
