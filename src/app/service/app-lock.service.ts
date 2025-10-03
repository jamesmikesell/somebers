import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LockService {
  private readonly lockName = 'app-exclusive-lock';
  private readonly instanceId = this.generateInstanceId();
  private readonly storageAvailable: boolean;
  private lockLostSubject = new Subject<void>();
  private hasLockSubject = new BehaviorSubject<boolean>(false);
  private storage: Storage | null = null;

  /**
   * Observable that emits when the lock is lost
   */
  public readonly lockLost$: Observable<void> = this.lockLostSubject.asObservable();

  /**
   * Observable that indicates whether this tab currently has the lock
   */
  public readonly hasLock$: Observable<boolean> = this.hasLockSubject.asObservable();

  public hasLock = false;

  constructor() {
    this.storageAvailable = this.tryInitializeStorage();

    if (!this.storageAvailable)
      return;

    window.addEventListener('storage', this.handleStorageEvent);
    window.addEventListener('unload', this.handleUnload);

    const currentOwner = this.safeStorageRead();
    this.setHasLock(currentOwner === this.instanceId);
  }


  async acquireLock(): Promise<void> {
    if (!this.storageAvailable)
      throw this.createAbortError('Lock storage is not available.');

    if (this.hasLock)
      return;

    try {
      const storage = this.getStorage();
      storage.setItem(this.lockName, this.instanceId);
      this.setHasLock(true);
    } catch (error) {
      throw this.createAbortError('Failed to acquire application lock.', error);
    }
  }

  async releaseLock(): Promise<void> {
    if (!this.storageAvailable || !this.hasLock)
      return;

    try {
      const storage = this.getStorage();
      const currentOwner = storage.getItem(this.lockName);

      if (currentOwner === this.instanceId)
        storage.removeItem(this.lockName);

      this.setHasLock(false);
    } catch (error) {
      throw this.createAbortError('Failed to release application lock.', error);
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.lockName)
      return;

    const newOwner = event.newValue;
    if (!this.hasLock)
      return;

    if (newOwner === this.instanceId)
      return;

    this.setHasLock(false);
    this.lockLostSubject.next();
  };

  private handleUnload = (): void => {
    if (!this.hasLock)
      return;

    this.releaseLock().catch(() => {
      // Best-effort release; ignore failures as the tab is closing.
    });
  };

  private setHasLock(value: boolean): void {
    if (this.hasLock === value)
      return;

    this.hasLock = value;
    this.hasLockSubject.next(value);
  }

  private tryInitializeStorage(): boolean {
    if (typeof window === 'undefined')
      return false;

    try {
      const storage = window.localStorage;
      const testKey = `${this.lockName}-probe`;
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);

      this.storage = storage;
      return true;
    } catch {
      this.storage = null;
      return false;
    }
  }

  private getStorage(): Storage {
    if (!this.storage)
      throw this.createAbortError('Lock storage is not available.');

    return this.storage;
  }

  private safeStorageRead(): string | null {
    if (!this.storage)
      return null;

    try {
      return this.storage.getItem(this.lockName);
    } catch {
      return null;
    }
  }

  private generateInstanceId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      return crypto.randomUUID();

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private createAbortError(message: string, cause?: unknown): DOMException {
    try {
      const domException = new DOMException(message, 'AbortError');
      if (cause !== undefined)
        (domException as unknown as { cause?: unknown }).cause = cause;

      return domException;
    } catch {
      const fallbackError = new Error(message);
      (fallbackError as Error & { name: string }).name = 'AbortError';
      if (cause !== undefined)
        (fallbackError as unknown as { cause?: unknown }).cause = cause;

      return fallbackError as DOMException;
    }
  }
}
