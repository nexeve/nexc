import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ModuleInstance, ModuleDefinition } from '../../core/types';
import { useAppStore } from '../../state/store';
import './TimerModule.css';

export const TimerModuleComponent: React.FC<{ instance: ModuleInstance }> = ({ instance }) => {
  const globalDuration = useAppStore(state => state.config.timerDurationMinutes);
  const { state, endTime, pausedRemainingMs, configuredSeconds: runtimeSeconds } = useAppStore(state => state.runtime.timer);
  
  const timerStart = useAppStore(state => state.timerStart);
  const timerPause = useAppStore(state => state.timerPause);
  const timerResume = useAppStore(state => state.timerResume);
  const timerReset = useAppStore(state => state.timerReset);

  const instanceDuration = instance.config?.durationMinutes as number | undefined;
  
  // Use runtime configured seconds if timer is active, else use current config
  const configuredMinutes = globalDuration ?? instanceDuration ?? 25;
  const configuredSeconds = state === 'idle' ? (configuredMinutes * 60) : runtimeSeconds;
  
  const [displayRemainingState, setDisplayRemainingState] = useState<number | null>(null);
  const timerDisplayRef = useRef<HTMLDivElement>(null);
  
  const [ringGeometry, setRingGeometry] = useState({ cx: 50, cy: 50, r: 48, circum: 301.6 });

  // Fallback to recalculate exact remaining instantly when unpaused or mounted mid-run
  const getExactRemaining = useCallback(() => {
    if (state === 'idle') return configuredSeconds;
    if (state === 'completed') return 0;
    if (state === 'paused') return Math.max(0, Math.ceil(pausedRemainingMs / 1000));
    
    // running
    return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  }, [state, endTime, pausedRemainingMs, configuredSeconds]);

  // Read latest display state instantly when state changes
  useEffect(() => {
    setDisplayRemainingState(getExactRemaining());
  }, [state, getExactRemaining]);

  const displayRemaining = state === 'idle' ? configuredSeconds : (displayRemainingState ?? getExactRemaining());
  const remainingFraction = configuredSeconds > 0 ? (displayRemaining / configuredSeconds) : 0;

  // Active timer tick
  useEffect(() => {
    if (state === 'running') {
      const interval = setInterval(() => {
        const remaining = getExactRemaining();
        if (remaining > 0) {
          setDisplayRemainingState(prev => (prev !== remaining ? remaining : prev));
        } else {
          setDisplayRemainingState(0);
        }
      }, 200);

      return () => {
        clearInterval(interval);
      };
    }
  }, [state, getExactRemaining]);

  // Update ring geometry robustly
  const updateGeometry = useCallback(() => {
    if (timerDisplayRef.current) {
      // Calculate based on physical untransformed dimensions
      const w = timerDisplayRef.current.offsetWidth;
      const h = timerDisplayRef.current.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.max(w, h) / 2 + 40; // 40px padding
      const circum = 2 * Math.PI * r;
      
      setRingGeometry(prev => {
        if (prev.cx !== cx || prev.cy !== cy || prev.r !== r) {
          return { cx, cy, r, circum };
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    if (!timerDisplayRef.current) return;
    const observer = new ResizeObserver(() => {
      updateGeometry();
    });
    observer.observe(timerDisplayRef.current);
    
    // Fallback/forced updates on layout/font-size changes
    window.addEventListener('resize', updateGeometry);
    updateGeometry();
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, [updateGeometry]);
  
  // Also track geometry precisely when display text changes just in case tabular-nums allows minor shifts
  useEffect(() => {
    updateGeometry();
  }, [displayRemaining, state, updateGeometry]);

  const handleStart = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (state === 'idle') {
      timerStart(configuredSeconds);
    } else if (state === 'paused') {
      timerResume();
    }
  }, [state, configuredSeconds, timerStart, timerResume]);

  const handlePause = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (state === 'running') {
      timerPause();
    }
  }, [state, timerPause]);

  const handleReset = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    timerReset();
    setDisplayRemainingState(null);
  }, [timerReset]);

  const formatTime = (totalSeconds: number) => {
    const s = Math.ceil(totalSeconds);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const strokeDashoffset = ringGeometry.circum * (1 - remainingFraction);

  // SVG viewBox needs to perfectly contain the circle
  // If r = 100, we need width at least 200 + strokeWidth
  const viewBoxSize = (ringGeometry.r + 20) * 2;
  const vbX = ringGeometry.cx - viewBoxSize / 2;
  const vbY = ringGeometry.cy - viewBoxSize / 2;

  return (
    <div className={`module-timer ${state === 'completed' ? 'timer-state-completed' : ''}`}>
      <div className="timer-core">
        <div className="timer-ring-container">
          <svg 
            className="timer-ring" 
            style={{ width: viewBoxSize, height: viewBoxSize }}
            viewBox={`${vbX} ${vbY} ${viewBoxSize} ${viewBoxSize}`} 
            preserveAspectRatio="xMidYMid meet"
          >
            <circle 
              cx={ringGeometry.cx} cy={ringGeometry.cy} r={ringGeometry.r} 
              fill="transparent" 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeWidth="1.5" 
            />
            <circle 
              cx={ringGeometry.cx} cy={ringGeometry.cy} r={ringGeometry.r} 
              fill="transparent" 
              stroke="var(--accent-color)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeDasharray={ringGeometry.circum}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${ringGeometry.cx} ${ringGeometry.cy})`}
              style={{ transition: state === 'running' ? 'stroke-dashoffset 0.2s linear' : 'none' }}
            />
          </svg>
        </div>

        <div className="timer-display" ref={timerDisplayRef}>
          {formatTime(displayRemaining)}
        </div>
      </div>

      <div className="timer-controls">
        {state === 'idle' && <button className="timer-btn" onClick={handleStart}>Start</button>}
        {state === 'running' && <button className="timer-btn" onClick={handlePause}>Pause</button>}
        {state === 'paused' && (
          <>
            <button className="timer-btn" onClick={handleStart}>Resume</button>
            <button className="timer-btn" onClick={handleReset}>Reset</button>
          </>
        )}
        {state === 'completed' && <button className="timer-btn" onClick={handleReset}>Reset</button>}
      </div>
    </div>
  );
};

export const TimerModule: ModuleDefinition = {
  id: 'timer',
  displayName: 'Timer',
  component: TimerModuleComponent,
};
