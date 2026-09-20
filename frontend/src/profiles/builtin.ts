import type { Profile } from '../core/types';

export const MINIMAL_PROFILE: Profile = {
  id: 'minimal',
  name: 'Minimal',
  type: 'builtin',
  environment: {
    frostEnabled: false,
    aura: { enabled: false },
  },
  visuals: {
    baseMaterial: 'void',
  },
  layout: {
    'clock': {
      id: 'clock',
      moduleId: 'clock',
      layout: { anchor: 'center', offset: { x: 0, y: 0 }, zIndex: 1, scale: 1.5 },
    }
  }
};

export const WORK_PROFILE: Profile = {
  id: 'work',
  name: 'Work',
  type: 'builtin',
  environment: {
    frostEnabled: false,
    aura: { enabled: false },
  },
  visuals: {
    baseMaterial: 'glass',
  },
  layout: {
    'clock': {
      id: 'clock',
      moduleId: 'clock',
      layout: { anchor: 'top-right', offset: { x: -2, y: 2 }, zIndex: 1, scale: 1 },
    },
    'date': {
      id: 'date',
      moduleId: 'date',
      layout: { anchor: 'top-right', offset: { x: -2, y: 12 }, zIndex: 1, scale: 0.9 },
    }
  }
};

export const MUSIC_PROFILE: Profile = {
  id: 'music',
  name: 'Music',
  type: 'builtin',
  environment: {
    frostEnabled: false,
    aura: { enabled: true },
  },
  visuals: {
    baseMaterial: 'void',
  },
  layout: {
    'clock': {
      id: 'clock',
      moduleId: 'clock',
      layout: { anchor: 'center', offset: { x: 0, y: 0 }, zIndex: 1, scale: 1.5 },
    }
  }
};

export const FOCUS_PROFILE: Profile = {
  id: 'focus',
  name: 'Focus',
  type: 'builtin',
  environment: {
    frostEnabled: false,
    aura: { enabled: false },
  },
  visuals: {
    baseMaterial: 'void',
  },
  layout: {
    'timer': {
      id: 'timer',
      moduleId: 'timer',
      layout: { anchor: 'center', offset: { x: 0, y: 0 }, zIndex: 1, scale: 1.0 },
      config: { durationMinutes: 25 },
    }
  }
};

export const BUILTIN_PROFILES: Record<string, Profile> = {
  [MINIMAL_PROFILE.id]: MINIMAL_PROFILE,
  [WORK_PROFILE.id]: WORK_PROFILE,
  [MUSIC_PROFILE.id]: MUSIC_PROFILE,
  [FOCUS_PROFILE.id]: FOCUS_PROFILE,
};
