import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwUpdate } from '@angular/service-worker';
import { timer } from 'rxjs';
import { AppVersion } from '../app-version';

@Injectable({
  providedIn: 'root'
})
export class VersionCheckService {
  public isUpdateAvailable = false;

  constructor(private http: HttpClient, private swUpdate: SwUpdate) { }

  startVersionCheck() {
    timer(5 * 1000, 10 * 60 * 1000).subscribe(() => {
      this.http.get<{ version: string }>('./version.json?t=' + new Date().getTime()).subscribe(
        (serverVersion) => {
          if (serverVersion.version !== AppVersion.VERSION) {
            if (this.swUpdate.isEnabled) {
              this.swUpdate.checkForUpdate().then(() => {
                this.isUpdateAvailable = true;
              });
            } else {
              this.isUpdateAvailable = true;
            }
          }
        }
      );
    });
  }

  public refreshApp() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then(() => {
        document.location.reload();
      });
    } else {
      document.location.reload();
    }
  }
}
