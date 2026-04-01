import { GAME_ENGINE_CONSTANTS } from "./game-engine.constants";

/**
 * Calcula o multiplicador baseado no tempo decorrido.
 * Fórmula: multiplier = e^(growthRate * elapsedMs)
 *
 * Isso cria uma curva exponencial que começa em 1.0x
 * e cresce suavemente ao longo do tempo.
 */
export function calculateMultiplier(elapsedMs: number): number {
  const { MULTIPLIER_GROWTH_RATE, INITIAL_MULTIPLIER } = GAME_ENGINE_CONSTANTS;

  const multiplier =
    INITIAL_MULTIPLIER * Math.exp(MULTIPLIER_GROWTH_RATE * elapsedMs);

  // Arredonda para 2 casas decimais
  return Math.floor(multiplier * 100) / 100;
}

/**
 * Calcula quanto tempo leva para atingir um determinado multiplicador.
 * Fórmula inversa: elapsedMs = ln(multiplier) / growthRate
 */
export function calculateTimeToMultiplier(targetMultiplier: number): number {
  const { MULTIPLIER_GROWTH_RATE } = GAME_ENGINE_CONSTANTS;
  return Math.log(targetMultiplier) / MULTIPLIER_GROWTH_RATE;
}
