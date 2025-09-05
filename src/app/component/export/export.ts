import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Compressor } from '../../model/saved-game-data/compression';
import { SaveDataService } from '../../service/save-data.service';
import { Title } from '../title/title';
import { ActivatedRoute, Router } from '@angular/router';

// TODO: delete this component in a few weeks
@Component({
  selector: 'app-export',
  standalone: true,
  imports: [CommonModule, MatButtonModule, Title],
  templateUrl: './export.html',
  styleUrl: './export.scss',
})
export class ExportComponent implements OnInit {
  message = '';
  storageUsageText = '';
  compressedSizeText = '';
  destUrl = 'https://www.somebers.com/#/export';
  inTransfer = false;
  progressText = '';
  showTransferWarning = false;
  readonly CHUNK_SIZE = 7000;
  private readonly B64URL_REGEX = /^[A-Za-z0-9_-]+$/;
  private lastExportObjectUrl: string | null = null;

  constructor(
    private saveDataService: SaveDataService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }


  async ngOnInit(): Promise<void> {
    // If participating in transfer, handle protocol first.
    const params = this.route.snapshot.queryParamMap;
    const op = params.get('op');
    if (op) {
      try {
        this.inTransfer = true;
        if (op === 'receive') {
          await this.handleReceive();
          return; // flow continues via redirects
        } else if (op === 'sendNext') {
          await this.handleSendNext();
          return;
        } else if (op === 'transferDone') {
          await this.handleTransferDone();
          return;
        }
      } catch (e) {
        console.error('Transfer handling error', e);
        this.message = 'Transfer failed. See console for details.';
      }
    }

    // Show strictly LocalStorage usage to avoid misleading 0B from origin-wide estimates.
    const bytes = this.estimateLocalStorageBytes();
    this.storageUsageText = `${this.humanReadableSizeConverter(bytes)} used`;

    // Compute compressed export size using the same logic as manual export.
    try {
      const b64String = await this.getCompressedAppData();
      if (b64String) {
        const sizeBytes = b64String.length; // assume each character is a byte
        this.compressedSizeText = this.humanReadableSizeConverter(sizeBytes);
      } else {
        this.compressedSizeText = 'No saved data';
      }
    } catch (e) {
      console.error('Compressed size calculation failed', e);
      this.compressedSizeText = 'Error calculating';
    }

    // Prefill destination URL from previous session
    // this.destUrl = localStorage.getItem('sn:lastDest') || '';

    // If a previous migration succeeded on this origin, show reminder overlay
    const migrated = localStorage.getItem('sn:xfer:success');
    this.showTransferWarning = !!migrated;
    if (migrated)
      this.cleanupTransferArtifacts();
  }


  async export(): Promise<void> {
    try {
      const b64String = await this.getCompressedAppData();
      if (!b64String) {
        this.message = 'No saved data found to export.';
        return;
      }

      const blob = new Blob([b64String], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `some-numbers-export-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.message = 'Export complete.';
    } catch (e) {
      console.error('Export failed', e);
      this.message = 'Export failed. See console for details.';
    }
  }

  dismissTransferWarning(): void {
    // Do not clear the flag so it shows again on next load
    this.showTransferWarning = false;
  }

  openSomebers(): void {
    const a = document.createElement('a');
    a.href = 'https://somebers.com';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  async beginTransfer(): Promise<void> {
    try {
      const dest = this.destUrl;
      if (!dest) {
        this.message = 'Destination URL is not configured.';
        return;
      }

      const payload = await this.getCompressedAppData();
      if (!payload) {
        this.message = 'No saved data found to transfer.';
        return;
      }

      // Guard size
      if (payload.length > 2_000_000) {
        this.message = 'Export too large to transfer (>2MB).';
        return;
      }

      const key = Date.now().toString();
      const total = Math.ceil(payload.length / this.CHUNK_SIZE);
      if (total > 200) {
        this.message = 'Too many chunks (>200).';
        return;
      }

      const srcExport = this.currentExportUrl();
      localStorage.setItem(`sn:xfer:${key}:payload`, payload);
      localStorage.setItem(`sn:xfer:${key}:total`, String(total));
      localStorage.setItem(`sn:xfer:${key}:dest`, dest);
      localStorage.setItem(`sn:xfer:activeKey`, key);

      const chunk0 = payload.substring(0, this.CHUNK_SIZE);
      const url = `${dest}?op=receive&key=${encodeURIComponent(key)}&idx=0&total=${encodeURIComponent(String(total))}` +
        `&data=${encodeURIComponent(chunk0)}&src=${encodeURIComponent(srcExport)}&dest=${encodeURIComponent(dest)}`;

      this.inTransfer = true;
      this.progressText = `Sending to ${new URL(dest).host}…`;
      window.location.href = url;
    } catch (e) {
      console.error('Begin transfer failed', e);
      this.message = 'Begin transfer failed. See console for details.';
    }
  }

  private currentExportUrl(): string {
    const loc = window.location;
    // Always prefer hash-based /export for this app
    return `${loc.origin}${loc.pathname}#/export`;
  }

  // Destination URL is supplied via code (hard-coded) and used as-is.

  private getParam(name: string): string | null {
    return this.route.snapshot.queryParamMap.get(name);
  }

  private parseIndexParam(name: string): number | null {
    const v = this.getParam(name);
    if (v == null) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  private validateChunkData(data: string): boolean {
    return !!data && this.B64URL_REGEX.test(data);
  }

  private chunkPayload(payload: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < payload.length; i += this.CHUNK_SIZE) {
      chunks.push(payload.substring(i, i + this.CHUNK_SIZE));
    }
    return chunks;
  }

  private async handleSendNext(): Promise<void> {
    const key = this.getParam('key');
    const idx = this.parseIndexParam('idx');
    const dest = this.getParam('dest');
    if (!key || idx == null || !dest) {
      this.message = 'Invalid sendNext request parameters.';
      return;
    }

    const payload = localStorage.getItem(`sn:xfer:${key}:payload`);
    const totalStr = localStorage.getItem(`sn:xfer:${key}:total`);
    if (!payload || !totalStr) {
      this.message = 'Transfer session not found on sender.';
      return;
    }
    const total = Number(totalStr);
    if (!(Number.isInteger(total) && total > 0) || idx < 0 || idx >= total) {
      this.message = 'Invalid chunk index.';
      return;
    }
    const start = idx * this.CHUNK_SIZE;
    const chunk = payload.substring(start, start + this.CHUNK_SIZE);
    if (!this.validateChunkData(chunk)) {
      this.message = 'Invalid chunk data.';
      return;
    }
    const srcExport = this.currentExportUrl();
    const url = `${dest}?op=receive&key=${encodeURIComponent(key)}&idx=${encodeURIComponent(String(idx))}` +
      `&total=${encodeURIComponent(String(total))}&data=${encodeURIComponent(chunk)}&src=${encodeURIComponent(srcExport)}` +
      `&dest=${encodeURIComponent(dest)}`;
    this.progressText = `Sending chunk ${idx + 1}/${total}…`;
    window.location.href = url;
  }

  private async handleReceive(): Promise<void> {
    const key = this.getParam('key');
    const idx = this.parseIndexParam('idx');
    const total = this.parseIndexParam('total');
    const data = this.getParam('data');
    const src = this.getParam('src');
    const dest = this.getParam('dest');

    if (!key || idx == null || total == null || !data || !src || !dest) {
      this.message = 'Invalid receive parameters.';
      return;
    }
    if (!(Number.isInteger(total) && total > 0) || idx < 0 || idx >= total) {
      this.message = 'Invalid chunk bounds.';
      return;
    }
    if (!this.validateChunkData(data)) {
      this.message = 'Invalid chunk encoding.';
      return;
    }

    this.appendChunk(key, idx, data, total);
    this.progressText = `Received chunk ${idx + 1}/${total}…`;

    if (idx === total - 1) {
      await this.assembleAndRestore(key);
      this.message = 'Transfer complete.';
      this.inTransfer = false;
      // Inform origin that transfer is done, then it will redirect back
      const loc = window.location;
      const returnUrl = `${loc.origin}${loc.pathname}#/transferComplete`;
      const url = `${src}?op=transferDone&return=${encodeURIComponent(returnUrl)}`;
      window.location.href = url;
      return;
    }

    const next = idx + 1;
    const url = `${src}?op=sendNext&key=${encodeURIComponent(key)}&idx=${encodeURIComponent(String(next))}` +
      `&dest=${encodeURIComponent(dest)}`;
    window.location.href = url;
  }

  private appendChunk(key: string, idx: number, chunk: string, total: number): void {
    const totalKey = `sn:rx:${key}:total`;
    const chunksKey = `sn:rx:${key}:chunks`;
    const countKey = `sn:rx:${key}:receivedCount`;

    const storedTotal = localStorage.getItem(totalKey);
    if (!storedTotal) {
      localStorage.setItem(totalKey, String(total));
    }

    const chunksStr = localStorage.getItem(chunksKey);
    let chunks: (string | null)[] = chunksStr ? JSON.parse(chunksStr) : [];
    chunks[idx] = chunk;
    localStorage.setItem(chunksKey, JSON.stringify(chunks));

    const countStr = localStorage.getItem(countKey);
    const count = countStr ? Number(countStr) : 0;
    localStorage.setItem(countKey, String(count + 1));
  }

  private async handleTransferDone(): Promise<void> {
    // Origin side: mark transfer success and redirect back if return URL provided
    try {
      const now = Date.now();
      localStorage.setItem('sn:xfer:success', String(now));
    } catch (e) {
      console.warn('Failed to write transfer success flag', e);
    }

    const returnUrl = this.getParam('return');
    if (returnUrl) {
      window.location.href = returnUrl;
      return;
    }
    // Fallback: strip params and stay on export
    await this.router.navigate(['export'], { replaceUrl: true });
  }

  private async assembleAndRestore(key: string): Promise<void> {
    const chunksStr = localStorage.getItem(`sn:rx:${key}:chunks`);
    const totalStr = localStorage.getItem(`sn:rx:${key}:total`);
    if (!chunksStr || !totalStr) {
      throw new Error('Receiver session incomplete');
    }
    const total = Number(totalStr);
    const chunks: string[] = JSON.parse(chunksStr);
    if (!Array.isArray(chunks) || chunks.length < total) {
      throw new Error('Missing chunks');
    }
    const payload = chunks.slice(0, total).join('');
    const compressor = new Compressor();
    const buffer = compressor.decodeBase64UrlToArrayBuffer(payload);
    const json = await compressor.deCompressString(buffer);
    const parsed = JSON.parse(json);
    this.saveDataService.service.saveNoWait(parsed);
    this.clearReceiverSession(key);
    // Best effort: clear sender session if same origin used both roles
    this.clearSenderSession(key);
  }

  private clearSenderSession(key: string): void {
    localStorage.removeItem(`sn:xfer:${key}:payload`);
    localStorage.removeItem(`sn:xfer:${key}:total`);
    localStorage.removeItem(`sn:xfer:${key}:dest`);
    const active = localStorage.getItem('sn:xfer:activeKey');
    if (active === key) localStorage.removeItem('sn:xfer:activeKey');
  }

  private clearReceiverSession(key: string): void {
    localStorage.removeItem(`sn:rx:${key}:total`);
    localStorage.removeItem(`sn:rx:${key}:chunks`);
    localStorage.removeItem(`sn:rx:${key}:receivedCount`);
  }

  private cleanupTransferArtifacts(): void {
    // If a successful transfer has occurred before, clear any lingering
    // sn:xfer:* keys except the success marker itself.
    try {
      // Iterate in reverse since we are mutating during iteration
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('sn:xfer:') && key !== 'sn:xfer:success') {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Failed to clear previous transfer artifacts', e);
    }
  }

  // Shared export pipeline: load -> save -> JSON -> compress -> b64String
  private async getCompressedAppData(): Promise<string | null> {
    const data = await this.saveDataService.service.load();
    if (!data)
      return null;
    // Persist latest state before export/size calc
    this.saveDataService.service.saveNoWait(data);
    const json = JSON.stringify(data);
    const compressor = new Compressor();
    const compressed = await compressor.compressString(json);
    return compressor.base64UrlString(compressed);
  }

  private estimateLocalStorageBytes(): number {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = key ? localStorage.getItem(key) : null;
      totalChars += (key?.length || 0) + (value?.length || 0);
    }
    return totalChars * 2;
  }

  private humanReadableSizeConverter(bytes: number): string {
    if (!isFinite(bytes) || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let num = bytes;
    while (num >= 1024 && i < units.length - 1) {
      num /= 1024;
      i++;
    }
    return `${num.toFixed(num >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
