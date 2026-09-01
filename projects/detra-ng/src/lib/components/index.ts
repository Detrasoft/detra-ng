// Buttons & primitives
export { BadgeComponent } from './badge/badge.component';
export { ButtonComponent } from './button/button.component';
export { InfoboxComponent, type InfoboxColor } from './infobox/infobox.component';

// Form controls (CVA)
export { InputComponent } from './input/input.component';
export { TextareaComponent } from './textarea/textarea.component';
export { CheckboxComponent } from './checkbox/checkbox.component';

// Errors
export { ErrorPanelComponent } from './error-panel/error-panel.component';
export type { ApiFieldError, ApiValidationError } from './error-panel/error-panel.component';

// Lists & trees
export { ListComponent } from './list/list.component';
export { ListColumnDirective } from './list/list-column.directive';
export { TreeComponent, type TreeNode } from './tree/tree.component';
export { OrganizationChartComponent } from './organization-chart/organization-chart.component';
export type {
  OrgChartNode,
  OrgChartMember,
  OrgChartNodeType,
  OrgChartOrientation,
  OrgChartSelectionMode,
} from './organization-chart/organization-chart.types';

// Layout
export { TabbarComponent } from './tabbar/tabbar.component';
export { TabComponent } from './tabbar/tab.component';

// Pickers
export {
  DatepickerComponent,
  type DatepickerLocale,
  DATEPICKER_LOCALE_PT_BR,
  DATEPICKER_LOCALE_EN,
} from './datepicker/datepicker.component';
export { TimeComponent } from './time/time.component';

// Dropdowns & overlays
export { DropdownComponent } from './dropdown/dropdown.component';
export { AutocompleteComponent } from './autocomplete/autocomplete.component';

// Dialogs
export { DialogComponent } from './dialog/dialog.component';
export { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

// Toast (service + component)
export { ToastComponent } from './toast/toast.component';
export { ToastService, type ToastMessage } from './toast/toast.service';

// Search
export { SearchComponent } from './search/search.component';
export { SearchModalComponent } from './search-modal/search-modal.component';

// Rich editor
export { HtmlEditorComponent } from './html-editor/html-editor.component';
export { MdEditorComponent } from './md-editor/md-editor.component';
export {
  FlowchartEditorComponent,
  type FlowchartData,
  type FlowchartNode,
  type FlowchartEdge,
  type FlowchartNodeType,
  type FlowchartResult,
} from './flowchart-editor/flowchart-editor.component';

// Media & Image Crop
export { ImageCropComponent } from './image-crop/image-crop.component';
export type {
  CropResult,
  ImageCropShape,
  ImageCropOutputFormat,
} from './image-crop/image-crop.types';

// Calendar
export { CalendarComponent } from './calendar/calendar.component';
export type {
  CalendarEvent,
  CalendarView,
  CalendarLocale,
  EventDropPayload,
  EventResizePayload,
} from './calendar/calendar.component';
export {
  CALENDAR_LOCALE_PT_BR,
  CALENDAR_LOCALE_EN,
} from './calendar/calendar.component';