import { Component, OnInit } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink } from '@angular/router';
import { AppVersion } from '../../app-version';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { SaveDataService } from '../../service/save-data.service';
import { InstallComponent } from '../install/install.component';
import { Title } from '../title/title';

@Component({
  selector: 'app-documentation',
  imports: [Title, InstallComponent, ...MATERIAL_IMPORTS, RouterLink, MatExpansionModule],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
})
export class Documentation implements OnInit {
  AppVersion = AppVersion;

  readonly iosVideoOptions: readonly IosVideoOption[] = [
    {
      id: 'iphone-18',
      buttonLabel: 'Watch iPhone tutorial (iOS 18 and earlier)',
      src: '/install-iphone-ios-18.mp4',
    },
    {
      id: 'iphone-26',
      buttonLabel: 'Watch iPhone tutorial (iOS 26 and newer)',
      src: '/install-iphone-ios-26.mp4',
    },
    {
      id: 'ipad-18',
      buttonLabel: 'Watch iPad tutorial (iOS 18 and earlier)',
      src: '/install-ipad-ios-18.mp4',
    },
    {
      id: 'ipad-26',
      buttonLabel: 'Watch iPad tutorial (iOS 26 and newer)',
      src: '/install-ipad-ios-26.mp4',
    },
  ];

  selectedIosVideoId: string | null = null;
  timeSpentDays: string;
  timeSpentHours: string;

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


  constructor(
    private saveDataService: SaveDataService,
  ) { }


  async ngOnInit(): Promise<void> {
    let savedData = await this.saveDataService.service.load();
    if (savedData) {
      let timeSpent = savedData.inProgressGames
        .reduce((total, current) => (current.timeSpent ?? 0) + total, 0);

      const totalSeconds = Math.floor(timeSpent / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts: string[] = [];
      if (days > 0) parts.push(`${days} days`);
      if (hours > 0) parts.push(`${hours} hours`);
      if (minutes > 0) parts.push(`${minutes} minutes`);
      if (seconds > 0 || parts.length === 0) parts.push(`and ${seconds} seconds`);

      this.timeSpentDays = parts.join(" ");
      this.timeSpentHours = (totalSeconds / 60 / 60).toFixed(1);
    }
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
