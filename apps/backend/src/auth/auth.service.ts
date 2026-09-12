import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth-user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  sid?: string;
}

function pepperize(password: string): string {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) return password;
  return createHmac('sha256', pepper).update(password).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(pepperize(dto.password), 10);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name: dto.name,
          phone: dto.phone,
          role: Role.PATIENT,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }

    const token = this.generateToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.verifyPassword(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (await bcrypt.compare(pepperize(password), storedHash)) return true;
    if (pepperize(password) !== password) {
      return bcrypt.compare(password, storedHash);
    }
    return false;
  }

  validateUser(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
      role: payload.role,
      ...(payload.sid ? { sessionId: payload.sid } : {}),
    };
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign({ ...payload, sid: payload.sid ?? randomUUID() });
  }
}

export { RegisterDto } from './dto/register.dto';
export { LoginDto } from './dto/login.dto';