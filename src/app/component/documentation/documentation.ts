import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink } from '@angular/router';
import { AppVersion } from '../../app-version';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { DeviceInfo, DeviceInfoService } from '../../service/device-info.service';
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
  recommendedIosVideoId: string | null = null;
  showAllIosOptions = false;
  deviceInfo: DeviceInfo | null = null;
  timeSpentDays: string;
  timeSpentHours: string;
  @ViewChild('iosVideoPlayer') iosVideoPlayer?: ElementRef<HTMLVideoElement>;
  @ViewChild('iosVideoPlayerContainer') iosVideoPlayerContainer?: ElementRef<HTMLElement>;

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

  get iosRecommendedVideo(): IosVideoOption | null {
    if (!this.recommendedIosVideoId) {
      return null;
    }

    return (
      this.iosVideoOptions.find(
        (option) => option.id === this.recommendedIosVideoId,
      ) ?? null
    );
  }

  get iosDetectionSummary(): string {
    if (!this.deviceInfo) {
      return 'Device not detected';
    }

    const device = this.deviceInfo.deviceModelGuess;
    const browser = this.deviceInfo.browserVersionGuess;
    return `${device} • ${browser}`;
  }


  constructor(
    private saveDataService: SaveDataService,
    private deviceInfoService: DeviceInfoService,
  ) { }


  async ngOnInit(): Promise<void> {
    this.deviceInfo = this.deviceInfoService.getDeviceInfo();
    this.recommendedIosVideoId = this.chooseIosVideoId(this.deviceInfo);
    this.selectedIosVideoId = this.recommendedIosVideoId;

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


  setIosVideo(
    option: IosVideoOption,
    opts: { revealOtherOptions?: boolean; autoplay?: boolean; scrollIntoView?: boolean } = {},
  ): void {
    this.selectedIosVideoId = option.id;
    if (opts.revealOtherOptions) {
      this.showAllIosOptions = true;
    }

    if (opts.autoplay || opts.scrollIntoView) {
      setTimeout(() => {
        if (opts.autoplay) this.tryPlaySelectedVideo();
        if (opts.scrollIntoView) this.scrollToSelectedVideo();
      }, 0);
    }
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

  toggleIosVideoOptions(): void {
    this.showAllIosOptions = !this.showAllIosOptions;
  }

  private tryPlaySelectedVideo(): void {
    const player = this.iosVideoPlayer?.nativeElement;
    if (!player) return;
    try {
      void player.play();
    } catch (error) {
      console.warn('Unable to autoplay iOS install video', error);
    }
  }

  private scrollToSelectedVideo(): void {
    const target = this.iosVideoPlayerContainer?.nativeElement;
    if (!target?.scrollIntoView) {
      return;
    }
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      try {
        target.scrollIntoView();
      } catch (error) {
        console.warn('Unable to scroll to iOS install video', error);
      }
    }
  }

  private chooseIosVideoId(info: DeviceInfo | null): string | null {
    if (!info || !info.isLikelyIOS) {
      return null;
    }

    const isIpad = info.deviceModelGuess.toLowerCase().includes('ipad');
    const isIphone = info.deviceModelGuess.toLowerCase().includes('iphone');
    if (!isIpad && !isIphone) {
      return null;
    }

    const safariMajor = info.browserVersionMajor ?? null;
    const osTokenMajor = this.extractOsTokenMajor(info.iosOsToken);
    const versionMajor = safariMajor ?? osTokenMajor;
    const versionBucket = versionMajor !== null && versionMajor >= 26 ? '26' : '18';
    const devicePrefix = isIpad ? 'ipad' : 'iphone';

    const choiceId = `${devicePrefix}-${versionBucket}`;
    const found = this.iosVideoOptions.find((option) => option.id === choiceId);
    return found ? found.id : null;
  }

  private extractOsTokenMajor(osToken: string): number | null {
    if (!osToken) {
      return null;
    }

    const match = osToken.match(/(\d+)/);
    if (!match?.[1]) {
      return null;
    }

    const value = parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }
}

interface IosVideoOption {
  id: string;
  buttonLabel: string;
  src: string;
}
