import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {
  private cachedInfo: DeviceInfo | null = null;

  getDeviceInfo(): DeviceInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    if (typeof navigator === 'undefined') {
      this.cachedInfo = this.buildUnknownInfo();
      return this.cachedInfo;
    }

    try {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      const userAgentSnapshot = nav.userAgent ?? '';
      const platform = nav.platform ?? '';
      const userAgentDataPlatform = nav.userAgentData?.platform ?? '';
      const maxTouchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0;

      const deviceModelGuess = this.getDeviceModelGuess(
        userAgentSnapshot,
        platform,
        userAgentDataPlatform,
        maxTouchPoints,
      );
      const iosDetails = this.getIosDetails(userAgentSnapshot, deviceModelGuess);

      this.cachedInfo = {
        deviceModelGuess,
        iosVersionGuess: iosDetails.iosVersion,
        iosVersionSource: iosDetails.source,
        iosOsToken: iosDetails.osToken,
        browserVersionGuess: iosDetails.browserVersion,
        browserVersionMajor: iosDetails.browserVersionMajor,
        isLikelyIOS: this.isLikelyIosDevice(deviceModelGuess),
        userAgentSnapshot,
        platform,
        userAgentDataPlatform,
        maxTouchPoints,
      };
      return this.cachedInfo;
    } catch (error) {
      console.error('device-info: detection failed', error);
      this.cachedInfo = this.buildUnknownInfo();
      return this.cachedInfo;
    }
  }

  private buildUnknownInfo(): DeviceInfo {
    return {
      deviceModelGuess: 'Unknown',
      iosVersionGuess: 'Unknown',
      iosVersionSource: 'none',
      iosOsToken: '',
      browserVersionGuess: 'Unknown',
      browserVersionMajor: null,
      isLikelyIOS: false,
      userAgentSnapshot: '',
      platform: '',
      userAgentDataPlatform: '',
      maxTouchPoints: 0,
    };
  }

  private getDeviceModelGuess(
    userAgent: string,
    platform: string,
    userAgentDataPlatform: string,
    maxTouchPoints: number,
  ): string {
    const isiPad =
      /iPad/i.test(userAgent) ||
      /iPad/i.test(platform) ||
      userAgentDataPlatform === 'iPadOS' ||
      ((platform === 'MacIntel' || userAgentDataPlatform === 'macOS') && maxTouchPoints > 1);
    if (isiPad) return 'Likely iPad (iPadOS)';

    if (/iPhone/i.test(userAgent) || /iPhone/i.test(platform)) return 'Likely iPhone';
    if (/iPod/i.test(userAgent) || /iPod/i.test(platform)) return 'Likely iPod touch';
    if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'Possibly iPad (desktop UA)';
    if (/iOS/i.test(userAgent) || /Apple/i.test(userAgent)) return 'Possibly iOS device';

    return 'Not an iOS device';
  }

  private getIosDetails(userAgent: string, deviceModel: string): IosDetails {
    const osMatch = userAgent.match(/OS (\d+)[._](\d+)(?:[._](\d+))?/i);
    const safariMatch = userAgent.match(/Version\/(\d+(?:\.\d+)+)/i);

    const osVersion = osMatch ? [osMatch[1], osMatch[2], osMatch[3]].filter(Boolean).join('.') : null;
    const safariVersion = safariMatch ? safariMatch[1] : null;
    const osToken = osMatch ? osMatch[0].replace(/_/g, '.') : '';
    const safariMajor = safariVersion ? parseInt(safariVersion.split('.')[0] ?? '', 10) || null : null;

    if (!osVersion && !safariVersion) {
      const fallback = deviceModel.startsWith('Likely') || deviceModel.startsWith('Possibly')
        ? 'Unknown iOS/iPadOS version'
        : 'Not detected';
      return {
        iosVersion: fallback,
        browserVersion: 'Unknown',
        browserVersionMajor: null,
        source: 'none',
        osToken: '',
      };
    }

    const osLabel = deviceModel.includes('iPad') ? 'iPadOS' : 'iOS';
    if (safariVersion) {
      return {
        iosVersion: `${osLabel} (inferred from Safari ${safariVersion})`,
        browserVersion: `Safari ${safariVersion}`,
        browserVersionMajor: safariMajor,
        source: 'safari',
        osToken,
      };
    }

    return {
      iosVersion: `${osLabel} ${osVersion}`,
      browserVersion: safariVersion ? `Safari ${safariVersion}` : 'Unknown',
      browserVersionMajor: safariMajor,
      source: 'os-token',
      osToken,
    };
  }

  private isLikelyIosDevice(deviceModel: string): boolean {
    return deviceModel !== 'Not an iOS device' && deviceModel !== 'Unknown';
  }
}

export interface DeviceInfo {
  deviceModelGuess: string;
  iosVersionGuess: string;
  iosVersionSource: 'safari' | 'os-token' | 'none';
  iosOsToken: string;
  browserVersionGuess: string;
  browserVersionMajor: number | null;
  isLikelyIOS: boolean;
  userAgentSnapshot: string;
  platform: string;
  userAgentDataPlatform: string;
  maxTouchPoints: number;
}

interface IosDetails {
  iosVersion: string;
  browserVersion: string;
  browserVersionMajor: number | null;
  source: DeviceInfo['iosVersionSource'];
  osToken: string;
}
