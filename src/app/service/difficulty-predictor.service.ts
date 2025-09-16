import { Injectable } from '@angular/core';
import { ModelJson } from '../model/ml-types';
import { TrainingSample, predictRidge } from './ml-core';

@Injectable({ providedIn: 'root' })
export class DifficultyPredictorService {
  private packagedModelPromise?: Promise<ModelJson | undefined>;

  constructor() { }

  // Predict strictly using the downloaded packaged model (for Difficulty percentile display)
  async predictGameModel(features: TrainingSample): Promise<number | undefined> {
    try {
      const model = await this.loadPackagedModel();
      if (!model || model.modelType === 'baseline')
        return undefined;
      else
        return predictRidge(model, features);
    } catch (err) {
      console.warn('TimePredictorService.predictFromPackaged failed', err);
      return undefined;
    }
  }


  private async loadPackagedModel(): Promise<ModelJson | undefined> {
    if (!this.packagedModelPromise) {
      this.packagedModelPromise = fetch('difficulty-ml-model.json', { cache: 'no-cache' })
        .then(async (r: Response): Promise<ModelJson | undefined> => {
          if (!r.ok)
            return undefined;
          return (await r.json()) as ModelJson;
        })
        .catch((err: unknown): ModelJson | undefined => {
          console.warn('TimePredictorService: failed to load packaged model', err);
          return undefined;
        });
    }
    return this.packagedModelPromise;
  }


}


