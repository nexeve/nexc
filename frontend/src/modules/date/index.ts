import type { ModuleDefinition } from '../../core/types';
import { DateComponent } from './DateComponent';

export const DateModule: ModuleDefinition = {
  id: 'date',
  displayName: 'Date',
  defaultInstance: {
    layout: { anchor: 'top-right', offset: { x: 0, y: 0 }, zIndex: 1 }
  },
  component: DateComponent
};
