import React from 'react';
import { useAppStore, selectActiveProfile } from '../state/store';
import { ClockModule } from '../modules/clock';
import { DateModule } from '../modules/date';
import { TimerModule } from '../modules/timer';
import type { ModuleDefinition, LayoutConfig } from '../core/types';
import { MaterialWrapper } from '../visuals/MaterialWrapper';
import './LayoutManager.css';

// Registry of available modules
const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  [ClockModule.id]: ClockModule,
  [DateModule.id]: DateModule,
  [TimerModule.id]: TimerModule,
};

/**
 * Calculates absolute CSS positioning and transforms based on the Layout Engine rules.
 * Offsets are interpreted in `rem` units to scale gracefully across DPI boundaries.
 */
const getLayoutStyles = (layout: LayoutConfig): React.CSSProperties => {
  const { anchor, offset, zIndex, scale = 1 } = layout;
  const styles: React.CSSProperties = {
    zIndex,
  };

  switch (anchor) {
    case 'center':
      styles.top = '50%';
      styles.left = '50%';
      styles.transform = `translate(calc(-50% + ${offset.x}rem), calc(-50% + ${offset.y}rem)) scale(calc(${scale} * var(--composition-scale, 1)))`;
      styles.transformOrigin = '50% 50%';
      break;
    case 'top-left':
      styles.top = 0;
      styles.left = 0;
      styles.transform = `translate(${offset.x}rem, ${offset.y}rem) scale(calc(${scale} * var(--composition-scale, 1)))`;
      styles.transformOrigin = '0% 0%';
      break;
    case 'top-right':
      styles.top = 0;
      styles.right = 0;
      styles.transform = `translate(${offset.x}rem, ${offset.y}rem) scale(calc(${scale} * var(--composition-scale, 1)))`;
      styles.transformOrigin = '100% 0%';
      break;
    case 'bottom-left':
      styles.bottom = 0;
      styles.left = 0;
      styles.transform = `translate(${offset.x}rem, ${offset.y}rem) scale(calc(${scale} * var(--composition-scale, 1)))`;
      styles.transformOrigin = '0% 100%';
      break;
    case 'bottom-right':
      styles.bottom = 0;
      styles.right = 0;
      styles.transform = `translate(${offset.x}rem, ${offset.y}rem) scale(calc(${scale} * var(--composition-scale, 1)))`;
      styles.transformOrigin = '100% 100%';
      break;
  }

  return styles;
};

export const LayoutManager: React.FC = () => {
  const profile = useAppStore(selectActiveProfile);
  
  // Render mapped instances ordered cleanly by zIndex
  const moduleInstances = Object.values(profile.layout)
    .sort((a, b) => (a.layout.zIndex || 0) - (b.layout.zIndex || 0));

  return (
    <div className="layout-container" data-tauri-drag-region>
      {moduleInstances.map(instance => {
        const ModuleDef = MODULE_REGISTRY[instance.moduleId];
        if (!ModuleDef) return null;
        
        const Component = ModuleDef.component;
        
        // Resolve material: Module override -> Profile default
        const material = instance.visuals?.materialOverride || profile.visuals.baseMaterial;
        const layoutStyles = getLayoutStyles(instance.layout);

        return (
          <div key={instance.id} className="module-wrapper" style={layoutStyles}>
            <MaterialWrapper material={material}>
              <Component instance={instance} />
            </MaterialWrapper>
          </div>
        );
      })}
    </div>
  );
};
