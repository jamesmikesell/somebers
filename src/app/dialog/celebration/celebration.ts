import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CelebrationConfig } from './celebration-launcher.service';

@Component({
  standalone: true,
  imports: [],
  templateUrl: './celebration.html',
  styleUrl: './celebration.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class CelebrationDialog implements AfterViewInit, OnDestroy {

  @ViewChild('overlay', { static: false }) overlay!: ElementRef<HTMLDivElement>;

  isActive = true;
  config: CelebrationConfig;

  private animationIds: number[] = [];
  private autoCloseId: ReturnType<typeof setTimeout> | null = null;


  constructor(
    private dialogRef: MatDialogRef<CelebrationDialog, void>,
    @Inject(MAT_DIALOG_DATA) config: CelebrationConfig,
  ) {
    this.config = config;
  }


  ngAfterViewInit(): void {
    setTimeout(() => this.startAnimations(), 100);
    const duration = this.config.duration ?? 8000;
    this.autoCloseId = setTimeout(() => this.close(), duration);
  }


  ngOnDestroy(): void {
    this.isActive = false;
    if (this.autoCloseId !== null) {
      clearTimeout(this.autoCloseId);
      this.autoCloseId = null;
    }
    this.stopAnimations();
  }


  close(): void {
    if (!this.isActive) return;

    this.isActive = false;
    if (this.autoCloseId !== null) {
      clearTimeout(this.autoCloseId);
      this.autoCloseId = null;
    }
    this.stopAnimations();
    this.dialogRef.close();
  }


  private startAnimations(): void {
    if (!this.overlay?.nativeElement || !this.isActive) return;

    this.createConfetti();
    this.createFireworks();
  }


  private stopAnimations() {
    // Clear all animations
    this.animationIds.forEach(id => cancelAnimationFrame(id));
    this.animationIds = [];

    // Remove all confetti and fireworks
    if (this.overlay?.nativeElement) {
      const elements = this.overlay.nativeElement.querySelectorAll('.confetti, .firework');
      elements.forEach(el => el.remove());
    }
  }


  private createConfetti() {
    const overlay = this.overlay.nativeElement;

    const addConfetti = () => {
      if (!this.isActive) return;

      for (let i = 0; i < 5; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';

        overlay.appendChild(confetti);
        this.animateConfetti(confetti);
      }

      if (this.isActive) {
        const id = requestAnimationFrame(() => setTimeout(addConfetti, 100));
        this.animationIds.push(id);
      }
    };

    addConfetti();
  }


  private animateConfetti(confetti: HTMLElement) {
    const startTime = performance.now();
    const duration = parseFloat(confetti.style.animationDuration) * 1000;
    const startY = -10;
    const endY = window.innerHeight + 10;

    const animate = (currentTime: number) => {
      if (!this.isActive || !confetti.parentNode) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentY = startY + (endY - startY) * progress;
      const wobble = Math.sin(elapsed * 0.01) * 20;

      confetti.style.top = currentY + 'px';
      confetti.style.left = (parseFloat(confetti.style.left) + wobble * 0.01) + 'vw';
      confetti.style.transform = 'rotate(' + (elapsed * 0.2) + 'deg)';

      if (progress < 1) {
        const id = requestAnimationFrame(animate);
        this.animationIds.push(id);
      } else {
        confetti.remove();
      }
    };

    const id = requestAnimationFrame(animate);
    this.animationIds.push(id);
  }


  private createFireworks() {
    const overlay = this.overlay.nativeElement;

    const createFirework = () => {
      if (!this.isActive) return;

      const centerX = Math.random() * window.innerWidth;
      const centerY = Math.random() * window.innerHeight * 0.7 + window.innerHeight * 0.1;

      for (let i = 0; i < 12; i++) {
        const spark = document.createElement('div');
        spark.className = 'firework';
        spark.style.left = centerX + 'px';
        spark.style.top = centerY + 'px';

        overlay.appendChild(spark);
        this.animateFireworkSpark(spark, centerX, centerY, i);
      }

      if (this.isActive) {
        setTimeout(createFirework, Math.random() * 800 + 400);
      }
    };

    // Start with multiple fireworks
    for (let i = 0; i < 3; i++) {
      setTimeout(createFirework, i * 200);
    }
  }


  private animateFireworkSpark(spark: HTMLElement, centerX: number, centerY: number, index: number) {
    const angle = (index / 12) * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const gravity = 0.5;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity;
    let x = centerX;
    let y = centerY;
    let life = 60;

    const animate = () => {
      if (!this.isActive || !spark.parentNode || life <= 0) {
        spark.remove();
        return;
      }

      x += vx * 0.016;
      y += vy * 0.016;
      vy += gravity;
      life--;

      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      spark.style.opacity = (life / 60).toString();

      const id = requestAnimationFrame(animate);
      this.animationIds.push(id);
    };

    const id = requestAnimationFrame(animate);
    this.animationIds.push(id);
  }
}
