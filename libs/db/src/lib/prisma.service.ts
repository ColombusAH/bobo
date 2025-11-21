import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Soft delete helper
  async softDelete<T>(model: any, where: any): Promise<T> {
    return model.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  // Find excluding soft-deleted
  excludeDeleted = {
    deletedAt: null,
  };
}

