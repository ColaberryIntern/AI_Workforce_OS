import { movingAverageForecaster } from '../ml/movingAverageForecaster.js';
import type { ForecastInput, ForecastResult } from '../ml/movingAverageForecaster.js';

/** Forecast provider abstraction. Prophet/ARIMA implementation plugs in here. */
export interface ForecastProvider {
  forecast(input: ForecastInput): Promise<ForecastResult>;
}

export class BaselineForecastProvider implements ForecastProvider {
  async forecast(input: ForecastInput): Promise<ForecastResult> {
    return movingAverageForecaster(input);
  }
}
