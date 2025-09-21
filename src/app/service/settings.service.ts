import { Injectable } from '@angular/core';

export type ColorModeSetting = 'auto' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storageKeys = {
    colorMode: 'colorMode',
    shapesModeEnabled: 'shapesModeEnabled',
    scratchPadVisible: 'scratchPadVisible',
    sectionCompletionAnimationEnabled: 'sectionCompletionAnimationEnabled',
    autoClearUnneededCells: 'autoClearUnneededCells',
    bestStreakDisplay: 'bestStreakDisplay',
    statsSecondaryDisplay: 'statsSecondaryDisplay',
    rowAndColumnCurrentSelectionSumVisible: 'rowAndColumnCurrentSelectionSumVisible',
  } as const;

  getColorMode(): ColorModeSetting {
    const stored = this.safeGetItem(this.storageKeys.colorMode);
    if (stored === 'light' || stored === 'dark' || stored === 'auto')
      return stored;

    return 'auto';
  }

  setColorMode(mode: ColorModeSetting): void {
    this.safeSetItem(this.storageKeys.colorMode, mode);
  }

  getShapesModeEnabled(): boolean {
    return this.getBoolean(this.storageKeys.shapesModeEnabled, false);
  }

  setShapesModeEnabled(enabled: boolean): void {
    this.setBoolean(this.storageKeys.shapesModeEnabled, enabled);
  }

  getScratchPadVisible(): boolean {
    return this.getBoolean(this.storageKeys.scratchPadVisible, true);
  }

  setScratchPadVisible(visible: boolean): void {
    this.setBoolean(this.storageKeys.scratchPadVisible, visible);
  }

  getSectionCompletionAnimationEnabled(): boolean {
    return this.getBoolean(this.storageKeys.sectionCompletionAnimationEnabled, true);
  }

  setSectionCompletionAnimationEnabled(enabled: boolean): void {
    this.setBoolean(this.storageKeys.sectionCompletionAnimationEnabled, enabled);
  }

  getAutoClearUnneededCells(): boolean {
    return this.getBoolean(this.storageKeys.autoClearUnneededCells, false);
  }

  setAutoClearUnneededCells(enabled: boolean): void {
    this.setBoolean(this.storageKeys.autoClearUnneededCells, enabled);
  }

  getRowAndColumnCurrentSelectionSumVisible(): boolean {
    return this.getBoolean(this.storageKeys.rowAndColumnCurrentSelectionSumVisible, true);
  }

  setRowAndColumnCurrentSelectionSumVisible(visible: boolean): void {
    this.setBoolean(this.storageKeys.rowAndColumnCurrentSelectionSumVisible, visible);
  }

  getBestStreakDisplay(): number {
    const index = this.getNumber(this.storageKeys.bestStreakDisplay, 0);
    return index < 0 ? 0 : index;
  }

  setBestStreakDisplay(index: number): void {
    this.setNumber(this.storageKeys.bestStreakDisplay, index);
  }

  getStatsSecondaryDisplay(): number {
    const index = this.getNumber(this.storageKeys.statsSecondaryDisplay, 0);
    return ((index % 2) + 2) % 2;
  }

  setStatsSecondaryDisplay(index: number): void {
    this.setNumber(this.storageKeys.statsSecondaryDisplay, index);
  }

  clearAllSettings(): void {
    Object.values(this.storageKeys).forEach(key => this.safeRemoveItem(key));
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const stored = this.safeGetItem(key);
    if (stored === null)
      return defaultValue;

    try {
      return JSON.parse(stored) === true;
    } catch (error) {
      console.error(`settings: failed to parse boolean for ${key}`, error);
      return defaultValue;
    }
  }

  private setBoolean(key: string, value: boolean): void {
    this.safeSetItem(key, JSON.stringify(value));
  }

  private getNumber(key: string, defaultValue: number): number {
    const stored = this.safeGetItem(key);
    if (stored === null)
      return defaultValue;

    const parsed = Number.parseInt(stored, 10);
    if (Number.isNaN(parsed))
      return defaultValue;

    return parsed;
  }

  private setNumber(key: string, value: number): void {
    this.safeSetItem(key, value.toString());
  }

  private safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`settings: failed to read key ${key}`, error);
      return null;
    }
  }

  private safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`settings: failed to write key ${key}`, error);
    }
  }

  private safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`settings: failed to remove key ${key}`, error);
    }
  }
}
