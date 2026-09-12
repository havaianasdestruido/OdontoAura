import { Body, Controller, Post, Get, UseGuards, Req, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService, RegisterDto, LoginDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginRateLimiter } from './login-rate-limiter';

const TOKEN_COOKIE = 'token';

type ReplyLike = { header: (name: string, value: string) => void };
type RequestLike = { ip?: string };

function setTokenCookie(reply: ReplyLike, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  reply.header(
    'Set-Cookie',
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Lax${secure}`,
  );
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginRateLimiter: LoginRateLimiter,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) reply: ReplyLike) {
    return this.authService.register(dto).then((result) => {
      setTokenCookie(reply, result.access_token);
      return result;
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  login(
    @Body() dto: LoginDto,
    @Req() req: RequestLike,
    @Res({ passthrough: true }) reply: ReplyLike,
  ) {
    const key = `${dto.email.toLowerCase()}|${req.ip}`;
    this.loginRateLimiter.assertAllowed(key);
    return this.authService.login(dto).then((result) => {
      setTokenCookie(reply, result.access_token);
      return result;
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) reply: ReplyLike) {
    reply.header('Set-Cookie', `${TOKEN_COOKIE}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0`);
    return { status: 'ok' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  getProfile(@Req() req: { user?: { id: string; email: string; name: string; role: Role } }) {
    if (!req.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return req.user;
  }
}