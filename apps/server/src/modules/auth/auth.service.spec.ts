import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// These variables must be declared BEFORE jest.mock due to hoisting
let mockUserRepo: { findUnique: jest.Mock; create: jest.Mock };

jest.mock('@prisma/client', () => {
  const mock = {
    user: { findUnique: jest.fn(), create: jest.fn() },
  };
  (global as any).__mockPrisma = mock;
  return { PrismaClient: jest.fn(() => mock) };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'fake-token'),
            verify: jest.fn(() => ({ userId: 'test-user' })),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    mockUserRepo = (global as any).__mockPrisma.user;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return null if user already exists', async () => {
      mockUserRepo.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });

      const result = await service.register('test@test.com', 'password123', 'Test');
      expect(result).toBeNull();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should create user and return profile', async () => {
      mockUserRepo.findUnique.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@test.com',
        name: 'New User',
      });

      const result = await service.register('new@test.com', 'password123', 'New User');
      expect(result).toEqual({ id: 'new-user-id', email: 'new@test.com', name: 'New User' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('login', () => {
    it('should return null if user not found', async () => {
      mockUserRepo.findUnique.mockResolvedValue(null);

      const result = await service.login('no@test.com', 'password');
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is wrong', async () => {
      mockUserRepo.findUnique.mockResolvedValue({
        id: '1', email: 'test@test.com', password: 'hashed', name: 'Test',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.login('test@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return user profile if credentials are valid', async () => {
      mockUserRepo.findUnique.mockResolvedValue({
        id: 'user-123', email: 'test@test.com', password: 'hashed', name: 'Test User',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'correctpassword');
      expect(result).toEqual({ id: 'user-123', email: 'test@test.com', name: 'Test User' });
    });
  });

  describe('signToken', () => {
    it('should sign a JWT with userId', () => {
      const token = service.signToken('test-user');
      expect(token).toBe('fake-token');
    });
  });

  describe('validateToken', () => {
    it('should return null for invalid tokens', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });
      const result = await service.validateToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return userId for valid tokens', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ userId: 'test-user' });
      const result = await service.validateToken('valid-token');
      expect(result).toEqual({ userId: 'test-user' });
    });
  });
});
