import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'ds-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  template: `
    <ng-template #dialogTemplate>
      <div class="ds-dialog-overlay" (click)="onBackdropClick()">
        <div [class]="cardClass" (click)="$event.stopPropagation()">
          <ng-content></ng-content>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './dialog.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DialogComponent implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);

  @Input() cardClass = 'ds-dialog-card';
  @Input() closeOnBackdropClick = true;

  private _isOpen = false;
  @Input()
  get isOpen(): boolean {
    return this._isOpen;
  }
  set isOpen(value: boolean) {
    if (this._isOpen !== value) {
      this._isOpen = value;
      if (value) {
        this.open();
      } else {
        this.close();
      }
    }
  }

  @Output() onClose = new EventEmitter<void>();

  @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<unknown>;
  private overlayRef: OverlayRef | null = null;

  ngOnDestroy(): void {
    this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.onClose.emit();
    }
  }

  private open(): void {
    if (this.overlayRef) return;

    if (!this.dialogTemplate) {
      // Defer execution until view is initialized
      setTimeout(() => this.open(), 0);
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: false,
      disposeOnNavigation: true,
    });

    const portal = new TemplatePortal(this.dialogTemplate, this.vcr);
    this.overlayRef.attach(portal);
  }

  private close(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
