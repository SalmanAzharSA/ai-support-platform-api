import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck() {
    return {
      status: 'OK',
      message: 'API is healthy and running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
