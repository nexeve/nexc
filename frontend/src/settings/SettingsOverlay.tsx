import React, { useRef } from 'react';
import { useAppStore, selectActiveProfile } from '../state/store';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import alarmsData from '../modules/timer/alarms.json';
import '../visuals/MaterialWrapper.css';
import './SettingsOverlay.css';

export const SettingsOverlay: React.FC = () => {
  const isSettingsOpen = useAppStore(state => state.ui.isSettingsOpen);
  const setSettingsOpen = useAppStore(state => state.setSettingsOpen);
  
  const activeProfileId = useAppStore(state => state.config.activeProfileId);
  const setActiveProfile = useAppStore(state => state.setActiveProfile);
  
  const globalSurfaceOpacity = useAppStore(state => state.config.globalSurfaceOpacity);
  const globalTypographyFamily = useAppStore(state => state.config.globalTypography.family);
  const timerDurationMinutes = useAppStore(state => state.config.timerDurationMinutes ?? 25);
  const timerAlarmSound = useAppStore(state => state.config.timerAlarmSound ?? 'soft');
  const timerCustomAlarmPath = useAppStore(state => state.config.timerCustomAlarmPath);
  
  const updateGlobalConfig = useAppStore(state => state.updateGlobalConfig);

  const activeProfile = useAppStore(selectActiveProfile);
  const clockInstance = activeProfile.layout['clock'];
  const clockFormat = (clockInstance?.config?.format as string) || '12h';

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!isSettingsOpen) return null;

  const updateClockFormat = (format: '12h' | '24h') => {
    if (!clockInstance) return;
    useAppStore.setState((state) => {
      const currentOverride = state.profileOverrides[activeProfileId] || {};
      const currentLayoutOverride = currentOverride.layout || {};
      const currentClockOverride = currentLayoutOverride['clock'] || {};
      return {
        profileOverrides: {
          ...state.profileOverrides,
          [activeProfileId]: {
            ...currentOverride,
            layout: {
              ...currentLayoutOverride,
              'clock': {
                ...clockInstance,
                ...currentClockOverride,
                config: {
                  ...clockInstance.config,
                  ...currentClockOverride.config,
                  format
                }
              }
            }
          }
        }
      };
    });
  };

  const handleCustomAlarmSelection = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['wav', 'mp3', 'ogg', 'm4a', 'flac']
        }]
      });
      if (selected && typeof selected === 'string') {
        updateGlobalConfig({ 
          timerAlarmSound: 'custom',
          timerCustomAlarmPath: selected
        });
      }
    } catch (e) {
      console.error("Failed to select file:", e);
    }
  };

  const playPreview = async () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    
    let src = (alarmsData as any)[timerAlarmSound] || (alarmsData as any)['soft'];
    let cleanupUrl = '';
    
    if (timerAlarmSound === 'custom' && timerCustomAlarmPath) {
      try {
        const bytes = await readFile(timerCustomAlarmPath);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        src = URL.createObjectURL(blob);
        cleanupUrl = src;
      } catch (e) {
        console.error("Preview custom sound failed:", e);
        src = (alarmsData as any)['soft'];
      }
    }
    
    const audio = new Audio(src);
    previewAudioRef.current = audio;
    audio.play().catch(console.error);
    
    if (cleanupUrl) {
      audio.onended = () => URL.revokeObjectURL(cleanupUrl);
    }
  };

  return (
    <div className="settings-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) setSettingsOpen(false);
    }}>
      <div className="settings-panel material-wrapper material-glass">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={() => setSettingsOpen(false)}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Profiles</h3>
            <div className="settings-group">
              <div className="settings-controls">
                <button 
                  className={`settings-btn ${activeProfileId === 'minimal' ? 'active' : ''}`}
                  onClick={() => setActiveProfile('minimal')}
                >
                  Minimal (1)
                </button>
                <button 
                  className={`settings-btn ${activeProfileId === 'work' ? 'active' : ''}`}
                  onClick={() => setActiveProfile('work')}
                >
                  Work (2)
                </button>
                <button 
                  className={`settings-btn ${activeProfileId === 'music' ? 'active' : ''}`}
                  onClick={() => setActiveProfile('music')}
                >
                  Music (3)
                </button>
                <button 
                  className={`settings-btn ${activeProfileId === 'focus' ? 'active' : ''}`}
                  onClick={() => setActiveProfile('focus')}
                >
                  Focus (4)
                </button>
              </div>
            </div>
            
            <div className="settings-slider-group">
              <label>
                <span>Environment Opacity</span>
                <span>{Math.round((globalSurfaceOpacity ?? 0.25) * 100)}%</span>
              </label>
              <input 
                type="range" 
                className="settings-slider"
                min="0" 
                max="100" 
                step="5"
                value={(globalSurfaceOpacity ?? 0.25) * 100} 
                onChange={(e) => updateGlobalConfig({ globalSurfaceOpacity: parseInt(e.target.value, 10) / 100 })}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>Clock Module</h3>
            <div className="settings-group">
              <label>Time Format</label>
              <div className="settings-controls">
                <button 
                  className={`settings-btn ${clockFormat === '12h' ? 'active' : ''}`}
                  onClick={() => updateClockFormat('12h')}
                >
                  12-hour
                </button>
                <button 
                  className={`settings-btn ${clockFormat === '24h' ? 'active' : ''}`}
                  onClick={() => updateClockFormat('24h')}
                >
                  24-hour
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Timer Module</h3>
            <div className="settings-slider-group">
              <label>
                <span>Duration</span>
                <span>{timerDurationMinutes} min</span>
              </label>
              <input 
                type="range" 
                className="settings-slider"
                min="1" 
                max="120" 
                step="1"
                value={timerDurationMinutes} 
                onChange={(e) => updateGlobalConfig({ timerDurationMinutes: parseInt(e.target.value, 10) })}
              />
            </div>
            
            <div className="settings-group" style={{ marginTop: '1rem' }}>
              <label>Alarm Sound</label>
              <div className="settings-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  className="settings-select"
                  value={timerAlarmSound}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom_browse') {
                      handleCustomAlarmSelection();
                    } else {
                      updateGlobalConfig({ timerAlarmSound: val });
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <option value="soft">Soft</option>
                  <option value="bell">Bell</option>
                  <option value="digital">Digital</option>
                  <option value="chime">Chime</option>
                  <option value="custom" disabled={timerAlarmSound !== 'custom'}>
                    {timerAlarmSound === 'custom' ? `Custom (${timerCustomAlarmPath?.split(/[/\\]/).pop()})` : 'Custom...'}
                  </option>
                  <option value="custom_browse">Choose File...</option>
                </select>
                <button className="settings-btn" onClick={playPreview} style={{ padding: '0 1rem' }}>
                  Preview
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Typography</h3>
            <div className="settings-group">
              <label>Typeface</label>
              <div className="settings-controls">
                <select 
                  className="settings-select"
                  value={globalTypographyFamily}
                  onChange={(e) => updateGlobalConfig({ globalTypography: { family: e.target.value } })}
                  style={{ fontFamily: globalTypographyFamily }}
                >
                  <option value='"JetBrains Mono", monospace' style={{ fontFamily: '"JetBrains Mono", monospace' }}>JetBrains Mono</option>
                  <option value='"Inter", sans-serif' style={{ fontFamily: '"Inter", sans-serif' }}>Inter</option>
                  <option value='"Space Grotesk", sans-serif' style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Space Grotesk</option>
                  <option value='"Geist", sans-serif' style={{ fontFamily: '"Geist", sans-serif' }}>Geist</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
