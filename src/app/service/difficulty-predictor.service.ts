import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ModelJson } from '../model/ml-types';
import { TrainingSample, predictRidge } from './ml-core';

@Injectable({ providedIn: 'root' })
export class DifficultyPredictorService {
  private packagedModelPromise?: Promise<ModelJson | undefined>;

  constructor(private http: HttpClient) { }

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
      this.packagedModelPromise = firstValueFrom(this.http.get<ModelJson>('difficulty-ml-model.json'))
        .catch((err: unknown): ModelJson | undefined => {
          console.warn('TimePredictorService: failed to load packaged model', err);
          return undefined;
        });
    }
    return this.packagedModelPromise;
  }


}

