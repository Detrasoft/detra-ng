import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DS_SKELETON_HOST, DsSkeletonDirective } from '../skeleton/skeleton.directive';

@Component({
  selector: 'ds-dialog',
  hostDirectives: [DS_SKELETON_HOST],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  template: `
    <ng-template #dialogTemplate>
      <div class="ds-dialog-overlay" (click)="onBackdropClick()">
        <div
          [class]="cardClass"
          [class.ds-sk]="sk.active()"
          [class.ds-sk-cover]="sk.active()"
          [attr.aria-busy]="sk.active() ? 'true' : null"
          (click)="$event.stopPropagation()"
        >
          <ng-container *ngIf="sk.active()">
            <div class="ds-sk-ph ds-sk-inline">
              <span data-sk class="ds-sk-dot"></span>
              <span data-sk class="ds-sk-title"></span>
            </div>
            <div class="ds-sk-ph ds-sk-stack">
              <span data-sk class="ds-sk-line"></span>
              <span data-sk class="ds-sk-line"></span>
              <span data-sk class="ds-sk-line"></span>
            </div>
            <div class="ds-sk-ph ds-sk-inline ds-sk-end">
              <span data-sk class="ds-sk-btn"></span>
              <span data-sk class="ds-sk-btn"></span>
            </div>
          </ng-container>
          <ng-content></ng-content>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './dialog.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DialogComponent implements OnDestroy {
  /** Estado do skeleton (`[skeleton]`), via host directive. */
  readonly sk = inject(DsSkeletonDirective);

  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);

  @Input() cardClass = 'ds-dialog-card';
  @Input() closeOnBackdropClick = true;
  /**
   * Destrói o overlay quando o Router navega (inclusive mudança só de query params).
   * Padrão `false`: telas que sincronizam seleção na URL (`router.navigate([], { queryParams })`)
   * fechavam a gaveta sem avisar. O overlay já é destruído no `ngOnDestroy`.
   */
  @Input() disposeOnNavigation = false;

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
  private closingInternally = false;

  ngOnDestroy(): void {
    this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.onClose.emit();
    }
  }

  private open(): void {
    if (this.overlayRef || !this._isOpen) return;

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
      disposeOnNavigation: this.disposeOnNavigation,
    });

    const ref = this.overlayRef;
    // Overlay destruído por fora (ex.: navegação com disposeOnNavigation): sincroniza o estado
    // para que o próximo [isOpen]="true" abra de novo, e avisa o pai via onClose.
    ref.detachments().subscribe(() => {
      if (this.overlayRef !== ref) return;
      this.overlayRef = null;
      if (this._isOpen) {
        this._isOpen = false;
        if (!this.closingInternally) this.onClose.emit();
      }
    });

    const portal = new TemplatePortal(this.dialogTemplate, this.vcr);
    ref.attach(portal);
  }

  private close(): void {
    const ref = this.overlayRef;
    if (!ref) return;
    this.overlayRef = null;
    this.closingInternally = true;
    try {
      ref.dispose();
    } finally {
      this.closingInternally = false;
    }
  }
}
