import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BoardUiService {
  private undoRequestedSubject = new Subject<void>();
  private restartRequestedSubject = new Subject<void>();

  readonly boardVisible$ = new BehaviorSubject<boolean>(false);
  readonly canUndo$ = new BehaviorSubject<boolean>(false);
  readonly showStartOver$ = new BehaviorSubject<boolean>(false);

  get undoRequested$(): Observable<void> {
    return this.undoRequestedSubject.asObservable();
  }


  requestUndo(): void {
    this.undoRequestedSubject.next();
  }


  setCanUndo(value: boolean): void {
    this.canUndo$.next(!!value);
  }


  requestRestart(): void {
    this.restartRequestedSubject.next();
  }


  get restartRequested$() {
    return this.restartRequestedSubject.asObservable();
  }


  setShowStartOver(value: boolean): void {
    this.showStartOver$.next(!!value);
  }
}
