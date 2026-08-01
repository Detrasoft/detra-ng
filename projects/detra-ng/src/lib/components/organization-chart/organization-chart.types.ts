export type OrgChartOrientation = 'vertical' | 'horizontal';
export type OrgChartSelectionMode = 'single' | 'multiple' | null;
export type OrgChartNodeType = 'person' | 'department';

/**
 * Represents a person/member card displayed inside a department node.
 * Each member renders as a mini-card within the department container.
 * Members can have children, forming a micro org chart inside the department.
 */
export interface OrgChartMember<T = any> {
  /** Display name (title) of the member */
  title?: string;
  /** Subtitle (e.g. role, position) */
  subtitle?: string;
  /** Short description */
  description?: string;
  /** FontAwesome icon class */
  icon?: string;
  /** Image URL for avatar (takes precedence over icon) */
  avatar?: string;
  /** Preset theme color or custom hex string */
  color?: string;
  /** Custom background color (e.g. soft pastel hex '#f0f7ff') */
  bgColor?: string;
  /** External portfolio/website link */
  link?: string;
  /** Custom payload data */
  data?: T;
  /** Child members forming a sub-hierarchy inside the department */
  children?: OrgChartMember<T>[];
}

export interface OrgChartNode<T = any> {
  /** Unique key or ID for selection and tracking */
  id?: string | number;
  /** Primary title of the card */
  title?: string;
  /** Alias for title (compatibility with generic tree nodes) */
  label?: string;
  /** Subtitle (e.g. region, location, role) */
  subtitle?: string;
  /** Detailed description or status text */
  description?: string;
  /** FontAwesome icon class (e.g. 'fas fa-cloud', 'fa-solid fa-database') */
  icon?: string;
  /** Image URL for avatar (takes precedence over icon if provided) */
  avatar?: string;
  /** Preset theme color ('primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' | 'teal' | 'sky') or custom hex string (e.g. '#f97316') */
  color?: string;
  /** Custom background color (e.g. soft pastel hex '#f0f7ff') */
  bgColor?: string;
  /** External portfolio/website link */
  link?: string;
  /** Custom payload data */
  data?: T;
  /** Subordinate child nodes */
  children?: OrgChartNode<T>[];
  /** Whether the child nodes are expanded/visible (default: true) */
  expanded?: boolean;
  /** Whether this node is selectable (default: true) */
  selectable?: boolean;
  /** Custom CSS class applied to the node card container */
  styleClass?: string;
  /** Type identifier for custom ng-template matching */
  type?: string;

  /* ── Department / Group node fields ── */

  /** Node type: 'person' (default single card) or 'department' (container with multiple member cards) */
  nodeType?: OrgChartNodeType;
  /** Label displayed in the department header (falls back to title/label if not set) */
  departmentLabel?: string;
  /** List of member cards rendered inside the department container */
  members?: OrgChartMember<T>[];
}
