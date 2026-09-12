import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor() {
    this.maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS) || 10;
    this.windowMs = (Number(process.env.LOGIN_WINDOW_MINUTES) || 15) * 60_000;
  }

  tryConsume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > this.maxAttempts) {
      return false;
    }
    return true;
  }

  assertAllowed(key: string): void {
    if (!this.tryConsume(key)) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}