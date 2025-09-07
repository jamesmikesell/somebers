import { Injectable } from '@angular/core';
import { openDB, type IDBPDatabase } from 'idb';


@Injectable({ providedIn: 'root' })
export class IdbService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  public static readonly dbName = 'somebers-db';
  public static readonly storeName = 'kv';

  async init(): Promise<void> {
    if (this.dbPromise)
      return;

    this.dbPromise = openDB(IdbService.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
      },
    });
    await this.dbPromise;
  }

  private async db(): Promise<IDBPDatabase> {
    if (!this.dbPromise)
      await this.init();

    return this.dbPromise!;
  }

  async get<T>(key: IDBValidKey): Promise<T | undefined> {
    const db = await this.db();
    return db.get(IdbService.storeName, key) as Promise<T | undefined>;
  }

  async set<T>(key: IDBValidKey, value: T): Promise<void> {
    const db = await this.db();
    await db.put(IdbService.storeName, value as any, key);
  }

  async delete(key: IDBValidKey): Promise<void> {
    const db = await this.db();
    await db.delete(IdbService.storeName, key);
  }
}
