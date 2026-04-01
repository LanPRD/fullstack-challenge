export interface ErrorPayload {
  message: string;
  issues?: Record<string, unknown>;
}
