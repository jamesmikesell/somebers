import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CelebrationConfig } from './celebration-launcher.service';
import { CelebrationWebglRenderer } from './celebration-webgl-renderer';

@Component({
  standalone: true,
  imports: [],
  templateUrl: './celebration.html',
  styleUrl: './celebration.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class CelebrationDialog implements AfterViewInit, OnDestroy {
  @ViewChild('overlay', { static: false }) overlay!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  isActive = true;
  webglSupported = true;
  readonly config: CelebrationConfig;

  private renderer: CelebrationWebglRenderer | null = null;
  private autoCloseId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<CelebrationDialog, void>,
    private readonly zone: NgZone,
    @Inject(MAT_DIALOG_DATA) config: CelebrationConfig,
  ) {
    this.config = config;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const canvas = this.canvasRef?.nativeElement;
      const overlay = this.overlay?.nativeElement;
      if (!canvas || !overlay) {
        return;
      }

      const renderer = new CelebrationWebglRenderer(this.config);
      const supported = renderer.initialize(canvas, overlay);

      if (!supported) {
        renderer.destroy();
        this.zone.run(() => {
          this.webglSupported = false;
        });
        return;
      }

      this.renderer = renderer;
    });

    const duration = this.config.duration ?? 8000;
    this.autoCloseId = setTimeout(() => this.close(), duration);
  }

  ngOnDestroy(): void {
    this.isActive = false;
    if (this.autoCloseId !== null) {
      clearTimeout(this.autoCloseId);
      this.autoCloseId = null;
    }
    this.zone.runOutsideAngular(() => this.renderer?.destroy());
    this.renderer = null;
  }

  close(): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.autoCloseId !== null) {
      clearTimeout(this.autoCloseId);
      this.autoCloseId = null;
    }

    this.zone.runOutsideAngular(() => this.renderer?.destroy());
    this.renderer = null;

    this.dialogRef.close();
  }
}
