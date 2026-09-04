import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: Role;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  private readonly users = new Map<string, { id: string; email: string; passwordHash: string; name: string; phone?: string; role: Role }>();
  private idCounter = 1;

  constructor(private readonly jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = Array.from(this.users.values()).find(u => u.email === dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = `usr_${this.idCounter++}`;
    const user = { id, email: dto.email, passwordHash, name: dto.name, phone: dto.phone, role: dto.role || Role.PATIENT };
    this.users.set(id, user);

    const token = this.generateToken({ sub: id, email: user.email, role: user.role });
    return { user: { id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  async login(dto: LoginDto) {
    const user = Array.from(this.users.values()).find(u => u.email === dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken({ sub: user.id, email: user.email, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, access_token: token };
  }

  async validateUser(payload: JwtPayload) {
    const user = this.users.get(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
