import { popularityRecommender } from '../ml/popularityRecommender.js';
import type { RecommenderInput, ScoredRecommendation } from '../ml/popularityRecommender.js';

/**
 * Recommender provider abstraction. Real ML models (Python service) plug in
 * by implementing this interface. Default impl is the deterministic baseline.
 */
export interface RecommenderProvider {
  recommend(input: RecommenderInput): Promise<ScoredRecommendation[]>;
}

export class BaselineRecommenderProvider implements RecommenderProvider {
  async recommend(input: RecommenderInput): Promise<ScoredRecommendation[]> {
    return popularityRecommender(input);
  }
}
