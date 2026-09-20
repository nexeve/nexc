export interface TypographyConfig {
  family: string;
}

export interface AuraConfig {
  enabled: boolean;
}

export interface ProfileEnvironment {
  frostEnabled: boolean;
  aura: AuraConfig;
}

export interface ProfileVisuals {
  baseMaterial: 'solid' | 'glass' | 'void';
}

export interface LayoutConfig {
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  offset: { x: number; y: number };
  zIndex: number;
  scale?: number;
}

export interface ModuleInstance {
  id: string;
  moduleId: string;
  layout: LayoutConfig;
  visuals?: {
    materialOverride?: 'solid' | 'glass' | 'void';
  };
  config?: Record<string, unknown>;
}

export interface ModuleDefinition {
  id: string;
  displayName: string;
  component: React.ComponentType<{ instance: ModuleInstance }>;
  defaultInstance?: Partial<ModuleInstance>;
}

export interface ProfileLayout {
  [key: string]: ModuleInstance;
}

export interface Profile {
  id: string;
  name: string;
  type: 'builtin' | 'custom';
  environment: ProfileEnvironment;
  visuals: ProfileVisuals;
  layout: ProfileLayout;
}

export interface AppConfig {
  activeProfileId: string;
  globalTypography: TypographyConfig;
  globalAccent: string;
  globalSurfaceOpacity?: number;
  timerDurationMinutes?: number;
  timerAlarmSound?: string;
  timerCustomAlarmPath?: string;
}
