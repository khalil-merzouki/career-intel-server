import { BadRequestException } from '@nestjs/common';

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Invalid request body.');
  return value as Record<string, unknown>;
}
export function string(value: unknown, name: string, max = 10000): string {
  if (typeof value !== 'string' || value.length > max)
    throw new BadRequestException(`Invalid ${name}.`);
  return value;
}
export function list(value: unknown, name: string, max = 100): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new BadRequestException(`Invalid ${name}.`);
  return value;
}
export function choice<T extends string>(
  value: unknown,
  name: string,
  choices: readonly T[],
): T {
  if (!choices.includes(value as T))
    throw new BadRequestException(`Invalid ${name}.`);
  return value as T;
}
export function date(value: unknown, name: string): string {
  const result = string(value, name, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(Date.parse(`${result}T00:00:00Z`)) ||
    new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result
  )
    throw new BadRequestException(`Invalid ${name}.`);
  return result;
}
export function id(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException('Invalid id.');
  return value;
}
