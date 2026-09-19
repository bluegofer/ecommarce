// apps/api/src/modules/inventory/reservations.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { randomUUID } from 'crypto';
import type { ReservationDto } from '@ecommarce/types';

const DEFAULT_TTL_SECONDS = 600;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async reserve(
    variantId: string,
    quantity: number,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<ReservationDto> {
    if (quantity <= 0) throw new ConflictException('quantity must be > 0');

    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });
    if (!variant) throw new NotFoundException('variant not found');

    const reservationId = randomUUID();
    const resKey = 'inv:res:' + variantId + ':' + reservationId;
    const aggKey = 'inv:reserved:' + variantId;

    const lua = `
      local aggKey = KEYS[1]
      local resKey = KEYS[2]
      local stock = tonumber(ARGV[1])
      local qty = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      local current = tonumber(redis.call('GET', aggKey) or '0')
      if current + qty > stock then
        return -1
      end
      redis.call('INCRBY', aggKey, qty)
      redis.call('EXPIRE', aggKey, ttl)
      redis.call('SET', resKey, qty, 'EX', ttl)
      return current + qty
    `;

    const result = (await this.redis.client.eval(
      lua,
      2,
      aggKey,
      resKey,
      variant.stock.toString(),
      quantity.toString(),
      ttlSeconds.toString(),
    )) as number;

    if (result === -1) {
      throw new ConflictException('insufficient available stock for variant ' + variantId);
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return { reservationId, variantId, quantity, expiresAt };
  }

  async release(variantId: string, reservationId: string): Promise<void> {
    const resKey = 'inv:res:' + variantId + ':' + reservationId;
    const aggKey = 'inv:reserved:' + variantId;
    const lua = `
      local resKey = KEYS[1]
      local aggKey = KEYS[2]
      local qty = tonumber(redis.call('GET', resKey) or '0')
      if qty > 0 then
        redis.call('DEL', resKey)
        local remaining = redis.call('DECRBY', aggKey, qty)
        if remaining <= 0 then redis.call('DEL', aggKey) end
      end
      return qty
    `;
    await this.redis.client.eval(lua, 2, resKey, aggKey);
  }

  async getReservedQty(variantId: string): Promise<number> {
    const raw = await this.redis.client.get('inv:reserved:' + variantId);
    return raw ? Number(raw) : 0;
  }

  async getAvailable(variantId: string): Promise<number> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });
    if (!variant) throw new NotFoundException('variant not found');
    const reserved = await this.getReservedQty(variantId);
    return Math.max(0, variant.stock - reserved);
  }
}