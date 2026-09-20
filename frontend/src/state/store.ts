import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, Profile } from '../core/types';
import { BUILTIN_PROFILES } from '../profiles/builtin';

export type TimerRuntimeState = 'idle' | 'running' | 'paused' | 'completed';

export interface RuntimeState {
  timer: {
    state: TimerRuntimeState;
    endTime: number;
    pausedRemainingMs: number;
    configuredSeconds: number;
  };
}

interface AppState {
  config: AppConfig;
  profileOverrides: Record<string, Partial<Profile>>;
  ui: {
    isSettingsOpen: boolean;
  };
  runtime: RuntimeState;
  
  setActiveProfile: (id: string) => void;
  updateGlobalConfig: (config: Partial<AppConfig>) => void;
  setSettingsOpen: (isOpen: boolean) => void;

  timerStart: (durationSeconds: number) => void;
  timerPause: () => void;
  timerResume: () => void;
  timerReset: () => void;
  timerComplete: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      config: {
        activeProfileId: 'minimal',
        globalTypography: {
          family: '"JetBrains Mono", monospace',
        },
        globalAccent: '#ffffff',
        globalSurfaceOpacity: 0.25, // default opacity for environmental surface
        timerDurationMinutes: 25,
        timerAlarmSound: 'soft',
      },
      profileOverrides: {},
      ui: {
        isSettingsOpen: false,
      },
      runtime: {
        timer: {
          state: 'idle',
          endTime: 0,
          pausedRemainingMs: 0,
          configuredSeconds: 0,
        }
      },
      
      setActiveProfile: (id) => set((state) => ({ 
        config: { ...state.config, activeProfileId: id } 
      })),
      
      updateGlobalConfig: (update) => set((state) => ({
        config: { ...state.config, ...update }
      })),

      setSettingsOpen: (isOpen) => set({ ui: { isSettingsOpen: isOpen } }),

      timerStart: (durationSeconds) => set((state) => ({
        runtime: {
          ...state.runtime,
          timer: {
            state: 'running',
            endTime: Date.now() + durationSeconds * 1000,
            pausedRemainingMs: 0,
            configuredSeconds: durationSeconds
          }
        }
      })),

      timerPause: () => set((state) => {
        const timer = state.runtime.timer;
        if (timer.state !== 'running') return state;
        
        const remainingMs = Math.max(0, timer.endTime - Date.now());
        
        return {
          runtime: {
            ...state.runtime,
            timer: {
              ...timer,
              state: 'paused',
              pausedRemainingMs: remainingMs
            }
          }
        };
      }),

      timerResume: () => set((state) => {
        const timer = state.runtime.timer;
        if (timer.state !== 'paused') return state;
        
        return {
          runtime: {
            ...state.runtime,
            timer: {
              ...timer,
              state: 'running',
              endTime: Date.now() + timer.pausedRemainingMs
            }
          }
        };
      }),

      timerReset: () => set((state) => ({
        runtime: {
          ...state.runtime,
          timer: {
            ...state.runtime.timer,
            state: 'idle',
            endTime: 0,
            pausedRemainingMs: 0
          }
        }
      })),

      timerComplete: () => set((state) => ({
        runtime: {
          ...state.runtime,
          timer: {
            ...state.runtime.timer,
            state: 'completed',
            endTime: 0,
            pausedRemainingMs: 0
          }
        }
      })),
    }),
    {
      name: 'nexs-clock-storage',
      partialize: (state) => ({
        config: state.config,
        profileOverrides: state.profileOverrides,
      }),
      // Safely merge persisted state with current state to avoid missing new default properties
      merge: (persistedState: any, currentState) => {
        const { globalBlur: _obsoleteBlur, ...persistedConfig } = persistedState.config || {};
        
        return {
          ...currentState,
          ...persistedState,
          config: {
            ...currentState.config,
            ...persistedConfig,
            // Ensure new settings have a safe fallback if missing from persisted state
            globalSurfaceOpacity: persistedConfig.globalSurfaceOpacity ?? currentState.config.globalSurfaceOpacity,
            timerDurationMinutes: persistedConfig.timerDurationMinutes ?? currentState.config.timerDurationMinutes,
            timerAlarmSound: persistedConfig.timerAlarmSound ?? currentState.config.timerAlarmSound,
            timerCustomAlarmPath: persistedConfig.timerCustomAlarmPath ?? currentState.config.timerCustomAlarmPath,
          }
        };
      }
    }
  )
);

// Memoization variables for the selector to ensure reference stability
let lastState: AppState | null = null;
let lastProfile: Profile | null = null;

export const selectActiveProfile = (state: AppState): Profile => {
  // Return cached reference if the state object hasn't changed
  if (lastState === state && lastProfile) {
    return lastProfile;
  }

  const id = state.config.activeProfileId;
  const baseProfile = BUILTIN_PROFILES[id] || BUILTIN_PROFILES['minimal'];
  const overrides = state.profileOverrides[id];

  let mergedProfile: Profile;

  if (!overrides) {
    mergedProfile = baseProfile;
  } else {
    // Deep merge layout for Module Instances
    const mergedLayout = { ...baseProfile.layout };
    
    if (overrides.layout && typeof overrides.layout === 'object') {
      for (const [moduleId, instanceOverride] of Object.entries(overrides.layout)) {
        if (!instanceOverride || typeof instanceOverride !== 'object') continue;

        if (mergedLayout[moduleId]) {
          const baseInstance = mergedLayout[moduleId];
          
          // MIGRATION / SAFETY: Explicitly construct the override rather than blind-spreading.
          // This prevents any malformed localStorage (e.g. missing id, moduleId) from corrupting the layout.
          mergedLayout[moduleId] = {
            id: baseInstance.id,
            moduleId: baseInstance.moduleId,
            layout: {
              ...baseInstance.layout,
              ...(typeof (instanceOverride as any).layout === 'object' ? (instanceOverride as any).layout : {})
            },
            config: {
              ...(baseInstance.config || {}),
              ...(typeof (instanceOverride as any).config === 'object' ? (instanceOverride as any).config : {})
            },
            visuals: {
              ...(baseInstance.visuals || {}),
              ...(typeof (instanceOverride as any).visuals === 'object' ? (instanceOverride as any).visuals : {})
            }
          };
        }
      }
    }

    mergedProfile = {
      ...baseProfile,
      ...overrides,
      layout: mergedLayout,
    };
  }

  // Cache and return
  lastState = state;
  lastProfile = mergedProfile;
  return mergedProfile;
};
