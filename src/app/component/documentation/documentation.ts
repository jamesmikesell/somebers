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

  readonly iosVideoOptions: readonly IosVideoOption[] = [
    {
      id: 'iphone-18',
      buttonLabel: 'Watch iPhone demo (iOS 18 and earlier)',
      src: '/install-iphone-ios-18.mp4',
    },
    {
      id: 'iphone-26',
      buttonLabel: 'Watch iPhone demo (iOS 26 and newer)',
      src: '/install-iphone-ios-26.mp4',
    },
    {
      id: 'ipad-18',
      buttonLabel: 'Watch iPad demo (iOS 18 and earlier)',
      src: '/install-ipad-ios-18.mp4',
    },
    {
      id: 'ipad-26',
      buttonLabel: 'Watch iPad demo (iOS 26 and newer)',
      src: '/install-ipad-ios-26.mp4',
    },
  ];

  selectedIosVideoId: string | null = null;

  get selectedIosVideo(): IosVideoOption | null {
    if (!this.selectedIosVideoId) {
      return null;
    }

    return (
      this.iosVideoOptions.find(
        (option) => option.id === this.selectedIosVideoId,
      ) ?? null
    );
  }

  setIosVideo(option: IosVideoOption): void {
    if (this.selectedIosVideoId === option.id) {
      this.selectedIosVideoId = null;
      return;
    }

    this.selectedIosVideoId = option.id;
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

interface IosVideoOption {
  id: string;
  buttonLabel: string;
  src: string;
}
