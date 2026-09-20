import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { DesktopSurface } from './layout/DesktopSurface';
import { SettingsOverlay } from './settings/SettingsOverlay';
import { useAppStore } from './state/store';

import { TimerRuntimeController } from './modules/timer/TimerRuntimeController';

function App() {
  const isSettingsOpen = useAppStore(state => state.ui.isSettingsOpen);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  const setActiveProfile = useAppStore(state => state.setActiveProfile);
  const updateGlobalConfig = useAppStore(state => state.updateGlobalConfig);
  const globalSurfaceOpacity = useAppStore(state => state.config.globalSurfaceOpacity);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(!isSettingsOpen);
      } else if (e.key === 'Escape' && isSettingsOpen) {
        e.preventDefault();
        setSettingsOpen(false);
      } else if (e.key === '1') {
        e.preventDefault();
        setActiveProfile('minimal');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveProfile('work');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveProfile('music');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveProfile('focus');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setSettingsOpen, setActiveProfile]);

  useEffect(() => {
    invoke<string | null>('get_system_accent').then((accent) => {
      if (accent) {
        console.log('[Theme] Initial system accent resolved:', accent);
        updateGlobalConfig({ globalAccent: accent });
      }
    }).catch(err => console.error('[Theme] Failed to get system accent:', err));

    const unlistenPromise = listen<string>('system-accent-changed', (event) => {
      console.log('[Theme] Received system-accent-changed event:', event.payload);
      updateGlobalConfig({ globalAccent: event.payload });
    });
    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [updateGlobalConfig]);

  return (
    <div 
      className="app-root"
      style={{
        '--global-surface-opacity': globalSurfaceOpacity,
      } as React.CSSProperties}
    >
      <TimerRuntimeController />
      <DesktopSurface />
      <SettingsOverlay />
    </div>
  );
}

export default App;
