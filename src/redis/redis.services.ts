import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: Number(this.configService.get<string>('REDIS_PORT')) || 6379,
    });
  }

  async setAccessTokenBlacklist(jti: string, ttlSeconds: number) {
    console.log('Saving blacklisted token:', {
      key: this.getAccessTokenBlacklistKey(jti),
      ttlSeconds,
    });
    if (ttlSeconds <= 0) return;

    await this.redis.set(
      this.getAccessTokenBlacklistKey(jti),
      'blacklisted',
      'EX',
      ttlSeconds,
    );
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(this.getAccessTokenBlacklistKey(jti));

    return result === 'blacklisted';
  }

  private getAccessTokenBlacklistKey(jti: string) {
    return `auth:blacklist:access:${jti}`;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
