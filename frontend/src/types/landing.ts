export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}
 
export interface StatItem {
  num: string;
  label: string;
}
 
export interface StackPill {
  name: string;
  color: string;
}
 
export interface Step {
  num: string;
  title: string;
  desc: string;
  accentColor?: string;
}
 
export interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
  tags: { label: string; variant?: 'default' | 'purple' | 'red' | 'yellow' }[];
  accentColor?: string;
}
 
export interface FeatureSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  cards: FeatureCard[];
}
 
export interface ComparisonRow {
  capability: string;
  without: string;
  with: string;
  withOk?: boolean;
}
 
export type ModalType = 'login' | 'signup' | null;