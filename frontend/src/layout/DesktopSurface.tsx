import React from 'react';
import { useAppStore, selectActiveProfile } from '../state/store';
import './DesktopSurface.css';
import { LayoutManager } from './LayoutManager';
import { AuraEngine } from '../visuals/aura/AuraEngine';

export const DesktopSurface: React.FC = () => {
  const config = useAppStore(state => state.config);
  const activeProfile = useAppStore(selectActiveProfile);

  return (
    <div 
      className="desktop-surface"
      style={{
        '--accent-color': config.globalAccent,
        '--font-family': config.globalTypography.family,
      } as React.CSSProperties}
      data-tauri-drag-region
    >
      <AuraEngine config={activeProfile.environment.aura} />
      <LayoutManager />
    </div>
  );
};
