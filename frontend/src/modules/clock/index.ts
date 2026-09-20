import type { ModuleDefinition } from '../../core/types';
import { ClockComponent } from './ClockComponent';

export const ClockModule: ModuleDefinition = {
  id: 'clock',
  displayName: 'Clock',
  defaultInstance: {
    layout: { anchor: 'center', offset: { x: 0, y: 0 }, zIndex: 1 },
    config: { format: '12h' } // Sets 12h as the fallback configuration
  },
  component: ClockComponent
};
