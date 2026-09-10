import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    // TODO: race condition — findUnique + create is not atomic; catch P2002 unique violation instead
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
        phone: dto.phone,
        role: Role.PATIENT,
      },
    });

    const token = this.generateToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  async login(dto: LoginDto) {
    // TODO: add rate limiting on login to mitigate brute-force attacks
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  validateUser(payload: JwtPayload): AuthUser {
    return { id: payload.sub, email: payload.email, name: payload.name ?? '', role: payload.role };
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}

export { RegisterDto } from './dto/register.dto';
export { LoginDto } from './dto/login.dto';