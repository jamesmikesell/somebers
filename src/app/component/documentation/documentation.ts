import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppVersion } from '../../app-version';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { InstallComponent } from '../install/install.component';
import { Title } from '../title/title';

@Component({
  selector: 'app-documentation',
  imports: [Title, InstallComponent, ...MATERIAL_IMPORTS, RouterLink],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
})
export class Documentation {
  AppVersion = AppVersion;
  selectedIosVideo: IosDevice | null = null;

  setIosVideo(device: IosDevice): void {
    if (this.selectedIosVideo === device) {
      this.selectedIosVideo = null;
      return;
    }

    this.selectedIosVideo = device;
  }

  onIosVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }

    try {
      video.defaultPlaybackRate = 0.5;
      video.playbackRate = 0.5;
    } catch (error) {
      console.warn('Unable to set playback rate for iOS install video', error);
    }
  }
}

type IosDevice = 'iphone' | 'ipad';
