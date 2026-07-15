/**
 * Public API of @detrasoft/detra-ng components.
 *
 * Importe diretamente via '@detrasoft/detra-ng' (src/index.ts re-exporta este barrel).
 */

// Leaf — Form inputs / atoms
export { BadgeComponent } from './badge/badge.component';
export { ButtonComponent } from './button/button.component';
export { InputComponent } from './input/input.component';
export { TextareaComponent } from './textarea/textarea.component';
export { CheckboxComponent } from './checkbox/checkbox.component';
export { ErrorPanelComponent } from './error-panel/error-panel.component';
export type { ApiFieldError, ApiValidationError } from './error-panel/error-panel.component';

// Containers / lists
export { ListComponent } from './list/list.component';
export { ListColumnDirective } from './list/list-column.directive';
export { TreeComponent, type TreeNode } from './tree/tree.component';

// Tabs
export { TabbarComponent } from './tabbar/tabbar.component';
export { TabComponent } from './tabbar/tab.component';

// Picker / chooser
export { DatepickerComponent, type DatepickerLocale } from './datepicker/datepicker.component';
export { DropdownComponent } from './dropdown/dropdown.component';
export { AutocompleteComponent } from './autocomplete/autocomplete.component';

// Overlays (CDK)
export { DialogComponent } from './dialog/dialog.component';
export { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

// Toast
export { ToastComponent } from './toast/toast.component';
export { ToastService, type ToastMessage } from './toast/toast.service';

// Search (já exportado em lib/search/ — re-exportar aqui para completude)
export { SearchComponent } from './search/search.component';
export { SearchModalComponent } from './search-modal/search-modal.component';

// HTML Editor
export { HtmlEditorComponent } from './html-editor/html-editor.component';