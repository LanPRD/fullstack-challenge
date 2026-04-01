import type { Round, UniqueEntityId } from "../entities";

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export abstract class RoundRepository {
  abstract findById(id: UniqueEntityId): Promise<Round | null>;
  abstract findCurrent(): Promise<Round | null>;
  abstract findMany(
    options: PaginationOptions
  ): Promise<PaginatedResult<Round>>;
  abstract save(round: Round): Promise<void>;
}
