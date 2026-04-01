export const GAME_ENGINE_CONSTANTS = {
  BETTING_PHASE_DURATION_MS: 10_000, // 10 segundos para apostas
  TICK_INTERVAL_MS: 100, // Atualiza multiplicador a cada 100ms
  MULTIPLIER_GROWTH_RATE: 0.00006, // Taxa de crescimento exponencial
  INITIAL_MULTIPLIER: 1.0
} as const;
