import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CropResult, ImageCropOutputFormat, ImageCropShape } from './image-crop.types';

@Component({
  selector: 'ds-image-crop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-crop.component.html',
  styleUrl: './image-crop.component.css',
})
export class ImageCropComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  @Input() imageFile: File | Blob | null = null;
  @Input() imageSrc: string | null = null;
  @Input() aspectRatio = 1;
  @Input() shape: ImageCropShape = 'circle';
  @Input() outputWidth = 512;
  @Input() outputHeight = 512;
  @Input() outputFormat: ImageCropOutputFormat = 'image/png';
  @Input() outputQuality = 1.0;
  @Input() outputFileName = 'avatar-512x512.png';
  @Input() modal = true;
  @Input() closeOnBackdropClick = true;

  // Custom I18n labels
  @Input() title = 'Recortar imagem';
  @Input() zoomLabel = 'Zoom';
  @Input() previewLabel = 'Pré-visualização';
  @Input() rotateLabel = 'Ajustes';
  @Input() resetLabel = 'Centralizar';
  @Input() applyLabel = 'Aplicar';
  @Input() cancelLabel = 'Cancelar';

  // Zoom configs
  @Input() minZoom = 0.1;
  @Input() maxZoom = 4.0;
  @Input() zoomStep = 0.05;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cropComplete = new EventEmitter<CropResult>();
  @Output() cropCancel = new EventEmitter<void>();

  @ViewChild('cropCanvas', { static: false })
  cropCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('previewCanvas', { static: false })
  previewCanvas?: ElementRef<HTMLCanvasElement>;

  canvasWidth = 400;
  canvasHeight = 400;
  scale = 1;
  rotation = 0; // Degrees (0, 90, 180, 270)
  isProcessing = false;

  private image: HTMLImageElement | null = null;
  private imageX = 0;
  private imageY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastImageX = 0;
  private lastImageY = 0;

  // Pinch-to-zoom support
  private initialPinchDist = 0;
  private initialPinchScale = 1;

  // Base dimensions computed when image loads
  private baseDisplayWidth = 0;
  private baseDisplayHeight = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && (this.imageFile || this.imageSrc)) {
      setTimeout(() => this.loadImage(), 0);
    } else if (changes['imageFile'] && this.imageFile && this.visible) {
      this.loadImage();
    } else if (changes['imageSrc'] && this.imageSrc && this.visible) {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    this.image = null;
  }

  /* ── Carregamento da imagem ────────────────────────────────────────────── */
  private loadImage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        this.createImageElement(src);
      };
      reader.readAsDataURL(this.imageFile);
    } else if (this.imageSrc) {
      this.createImageElement(this.imageSrc);
    }
  }

  private createImageElement(src: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image = img;
      this.resetTransform();
      this.updateCanvas();
      this.cdr.markForCheck();
    };
    img.src = src;
  }

  /* ── Transformações e resets ───────────────────────────────────────────── */
  resetTransform(): void {
    if (!this.image) return;

    const imgAspect = this.image.width / this.image.height;
    const canvasAspect = this.canvasWidth / this.canvasHeight;

    if (imgAspect > canvasAspect) {
      this.baseDisplayHeight = this.canvasHeight;
      this.baseDisplayWidth = this.baseDisplayHeight * imgAspect;
    } else {
      this.baseDisplayWidth = this.canvasWidth;
      this.baseDisplayHeight = this.baseDisplayWidth / imgAspect;
    }

    this.imageX = 0;
    this.imageY = 0;
    this.scale = 1;
    this.rotation = 0;
    this.updateCanvas();
  }

  onScaleChange(): void {
    this.updateCanvas();
  }

  zoomIn(): void {
    this.scale = Math.min(this.maxZoom, +(this.scale + 0.1).toFixed(2));
    this.updateCanvas();
  }

  zoomOut(): void {
    this.scale = Math.max(this.minZoom, +(this.scale - 0.1).toFixed(2));
    this.updateCanvas();
  }

  rotateLeft(): void {
    this.rotation = (this.rotation - 90 + 360) % 360;
    this.updateCanvas();
  }

  rotateRight(): void {
    this.rotation = (this.rotation + 90) % 360;
    this.updateCanvas();
  }

  /* ── Renderização do Canvas Principal ──────────────────────────────────── */
  updateCanvas(): void {
    if (!this.image || !this.cropCanvas?.nativeElement) return;

    const canvas = this.cropCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar o canvas
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    // Desenhar imagem com transformações (translação, rotação e escala)
    ctx.save();
    ctx.translate(centerX + this.imageX, centerY + this.imageY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.scale, this.scale);

    ctx.drawImage(
      this.image,
      -this.baseDisplayWidth / 2,
      -this.baseDisplayHeight / 2,
      this.baseDisplayWidth,
      this.baseDisplayHeight
    );
    ctx.restore();

    // Desenhar máscara de recorte (Overlay escuro + corte circular/retangular)
    this.drawCropMask(ctx);

    // Atualizar preview ao vivo
    this.updatePreview();
  }

  private get cropRadius(): number {
    return Math.min(this.canvasWidth, this.canvasHeight) * 0.35; // Raio proporcional (140px)
  }

  private drawCropMask(ctx: CanvasRenderingContext2D): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const r = this.cropRadius;

    ctx.save();

    // 1. Overlay escuro em todo o canvas
    ctx.fillStyle = 'rgba(11, 9, 20, 0.65)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 2. Recorte transparente
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    if (this.shape === 'circle') {
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
    } else if (this.shape === 'round-rect') {
      this.drawRoundedRectPath(ctx, centerX - r, centerY - r, r * 2, r * 2, 16);
    } else {
      ctx.rect(centerX - r, centerY - r, r * 2, r * 2);
    }
    ctx.fill();

    // 3. Linhas guias e borda estética do recorte
    ctx.globalCompositeOperation = 'source-over';

    // Borda externa
    ctx.strokeStyle = '#896ff4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (this.shape === 'circle') {
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
    } else if (this.shape === 'round-rect') {
      this.drawRoundedRectPath(ctx, centerX - r, centerY - r, r * 2, r * 2, 16);
    } else {
      ctx.rect(centerX - r, centerY - r, r * 2, r * 2);
    }
    ctx.stroke();

    // Grade sutil tipo "regra dos terços"
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    // Linhas verticais
    ctx.moveTo(centerX - r / 3, centerY - r);
    ctx.lineTo(centerX - r / 3, centerY + r);
    ctx.moveTo(centerX + r / 3, centerY - r);
    ctx.lineTo(centerX + r / 3, centerY + r);
    // Linhas horizontais
    ctx.moveTo(centerX - r, centerY - r / 3);
    ctx.lineTo(centerX + r, centerY - r / 3);
    ctx.moveTo(centerX - r, centerY + r / 3);
    ctx.lineTo(centerX + r, centerY + r / 3);
    ctx.stroke();

    ctx.restore();
  }

  private drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /* ── Pré-visualização Instantânea ──────────────────────────────────────── */
  private updatePreview(): void {
    if (!this.image || !this.previewCanvas?.nativeElement) return;

    const pCanvas = this.previewCanvas.nativeElement;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;

    const pSize = 80;
    pCtx.clearRect(0, 0, pSize, pSize);

    const r = this.cropRadius;
    const cropDiameter = r * 2;
    const previewScale = pSize / cropDiameter;

    pCtx.save();
    if (this.shape === 'circle') {
      pCtx.beginPath();
      pCtx.arc(pSize / 2, pSize / 2, pSize / 2, 0, 2 * Math.PI);
      pCtx.clip();
    } else if (this.shape === 'round-rect') {
      this.drawRoundedRectPath(pCtx, 0, 0, pSize, pSize, 12);
      pCtx.clip();
    }

    pCtx.translate(pSize / 2, pSize / 2);
    pCtx.rotate((this.rotation * Math.PI) / 180);
    pCtx.scale(this.scale * previewScale, this.scale * previewScale);
    pCtx.translate(this.imageX / this.scale, this.imageY / this.scale);

    pCtx.drawImage(
      this.image,
      -this.baseDisplayWidth / 2,
      -this.baseDisplayHeight / 2,
      this.baseDisplayWidth,
      this.baseDisplayHeight
    );

    pCtx.restore();
  }

  /* ── Manipulação de Mouse (Desktop) ────────────────────────────────────── */
  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.lastImageX = this.imageX;
    this.lastImageY = this.imageY;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.imageX = this.lastImageX + dx;
    this.imageY = this.lastImageY + dy;
    this.updateCanvas();
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    this.scale = Math.min(this.maxZoom, Math.max(this.minZoom, +(this.scale + delta).toFixed(2)));
    this.updateCanvas();
    this.cdr.markForCheck();
  }

  /* ── Manipulação Touch & Pinch (Mobile / Tablet / Capacitor) ────────────── */
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      const touch = event.touches[0];
      this.dragStartX = touch.clientX;
      this.dragStartY = touch.clientY;
      this.lastImageX = this.imageX;
      this.lastImageY = this.imageY;
    } else if (event.touches.length === 2) {
      this.isDragging = false;
      this.initialPinchDist = this.getTouchDistance(event.touches);
      this.initialPinchScale = this.scale;
    }
  }

  onTouchMove(event: TouchEvent): void {
    event.preventDefault(); // Previne scroll de página durante crop

    if (event.touches.length === 1 && this.isDragging) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.dragStartX;
      const dy = touch.clientY - this.dragStartY;
      this.imageX = this.lastImageX + dx;
      this.imageY = this.lastImageY + dy;
      this.updateCanvas();
    } else if (event.touches.length === 2) {
      const dist = this.getTouchDistance(event.touches);
      if (this.initialPinchDist > 0) {
        const factor = dist / this.initialPinchDist;
        const targetScale = +(this.initialPinchScale * factor).toFixed(2);
        this.scale = Math.min(this.maxZoom, Math.max(this.minZoom, targetScale));
        this.updateCanvas();
        this.cdr.markForCheck();
      }
    }
  }

  onTouchEnd(): void {
    this.isDragging = false;
    this.initialPinchDist = 0;
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ── Execução do Recorte Final em Alta Resolução ───────────────────────── */
  crop(): void {
    if (!this.image || this.isProcessing) return;

    this.isProcessing = true;
    this.cdr.markForCheck();

    const outW = this.outputWidth;
    const outH = this.outputHeight;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = outW;
    offCanvas.height = outH;

    const ctx = offCanvas.getContext('2d');
    if (!ctx) {
      this.isProcessing = false;
      return;
    }

    const r = this.cropRadius;
    const cropDiameter = r * 2;
    const outputScale = outW / cropDiameter;

    ctx.save();
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, outW / 2, 0, 2 * Math.PI);
      ctx.clip();
    } else if (this.shape === 'round-rect') {
      this.drawRoundedRectPath(ctx, 0, 0, outW, outH, 24);
      ctx.clip();
    }

    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(this.scale * outputScale, this.scale * outputScale);
    ctx.translate(this.imageX / this.scale, this.imageY / this.scale);

    ctx.drawImage(
      this.image,
      -this.baseDisplayWidth / 2,
      -this.baseDisplayHeight / 2,
      this.baseDisplayWidth,
      this.baseDisplayHeight
    );
    ctx.restore();

    const base64 = offCanvas.toDataURL(this.outputFormat, this.outputQuality);

    offCanvas.toBlob(
      (blob) => {
        this.isProcessing = false;
        if (blob) {
          const croppedImageUrl = URL.createObjectURL(blob);
          const file = new File([blob], this.outputFileName, {
            type: this.outputFormat,
            lastModified: Date.now(),
          });

          this.cropComplete.emit({
            croppedImageBlob: blob,
            croppedImageUrl,
            file,
            base64,
            width: outW,
            height: outH,
          });
        }
        this.close();
      },
      this.outputFormat,
      this.outputQuality
    );
  }

  cancel(): void {
    this.cropCancel.emit();
    this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.cancel();
    }
  }

  private close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cdr.markForCheck();
  }
}
