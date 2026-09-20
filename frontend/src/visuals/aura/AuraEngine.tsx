import React, { useEffect, useRef } from 'react';
import type { AuraConfig } from '../../core/types';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../state/store';
import './AuraEngine.css';

interface AudioSpectrum {
  bands: number[];
}

interface AuraEngineProps {
  config: AuraConfig;
}

export const AuraEngine: React.FC<AuraEngineProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetBandsRef = useRef<number[]>(new Array(64).fill(0));
  const smoothedBandsRef = useRef<number[]>(new Array(64).fill(0));
  const accentColorRef = useRef<string>('#ffffff'); // Fallback
  
  const segmentsRef = useRef<number>(128);
  const sensitivityRef = useRef<number>(1.0);
  
  const clockRadiusRef = useRef<number>(100);
  const clockCenterRef = useRef<{x: number, y: number}>({x: 0, y: 0});

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      accentColorRef.current = state.config.globalAccent;
    });
    accentColorRef.current = useAppStore.getState().config.globalAccent;
    return unsub;
  }, []);

  useEffect(() => {
    if (!config.enabled) {
      invoke('set_audio_active', { active: false }).catch(() => {});
      return;
    }

    let geometryDirty = true;
    let activeTransitions = 0;

    const ro = new ResizeObserver(() => {
      geometryDirty = true;
    });
    ro.observe(document.body);
    // Try to observe the clock if it's already mounted, or it will be caught by body resize anyway
    const clockEl = document.querySelector('.module-clock');
    if (clockEl) ro.observe(clockEl);

    // Watch for active layout transitions (.module-wrapper)
    const handleTransition = (e: TransitionEvent, isStart: boolean) => {
      const target = e.target as HTMLElement;
      if (target && (target.closest('.module-wrapper') || target.closest('.module-clock'))) {
        if (isStart) {
          activeTransitions++;
        } else {
          activeTransitions = Math.max(0, activeTransitions - 1);
        }
        geometryDirty = true;
      }
    };

    const onTransitionStart = (e: TransitionEvent) => handleTransition(e, true);
    const onTransitionEnd = (e: TransitionEvent) => handleTransition(e, false);
    const onTransitionCancel = (e: TransitionEvent) => handleTransition(e, false);

    window.addEventListener('transitionstart', onTransitionStart);
    window.addEventListener('transitionend', onTransitionEnd);
    window.addEventListener('transitioncancel', onTransitionCancel);

    // Track state changes to active profile/layout just to be absolutely sure
    let prevProfileId = useAppStore.getState().config.activeProfileId;
    const unsubStore = useAppStore.subscribe((state) => {
      if (state.config.activeProfileId !== prevProfileId) {
        prevProfileId = state.config.activeProfileId;
        geometryDirty = true;
        // Re-observe if the DOM nodes re-mounted
        setTimeout(() => {
          const el = document.querySelector('.module-clock');
          if (el) ro.observe(el);
        }, 50);
      }
    });

    invoke('set_audio_active', { active: true }).catch(() => {});

    const unlistenPromise = listen<AudioSpectrum>('audio-spectrum', (event) => {
      targetBandsRef.current = event.payload.bands;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          segmentsRef.current = Math.min(segmentsRef.current + 8, 256);
          break;
        case 'ArrowDown':
          segmentsRef.current = Math.max(segmentsRef.current - 8, 16);
          break;
        case 'ArrowRight':
          sensitivityRef.current = Math.min(sensitivityRef.current + 0.2, 5.0);
          break;
        case 'ArrowLeft':
          sensitivityRef.current = Math.max(sensitivityRef.current - 0.2, 0.2);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    let animationFrameId: number;
    let lastTime = performance.now();

    const draw = (time: number) => {
      animationFrameId = requestAnimationFrame(draw);
      const dt = (time - lastTime) / 1000.0;
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Synchronize backing store and clock metrics in the same frame
      if (geometryDirty || activeTransitions > 0) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        const targetW = rect.width * dpr;
        const targetH = rect.height * dpr;
        
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const currentScaleStr = document.documentElement.style.getPropertyValue('--composition-scale');
        const currentScale = currentScaleStr ? parseFloat(currentScaleStr) : 1.0;

        const maxVisualizerDisplacementRatio = 0.5;
        const strokeW = 3.0 * dpr;
        const safetyMargin = 15 * dpr;
        const availableRadius = Math.min(targetW, targetH) / 2 - strokeW - safetyMargin;

        const el = document.querySelector('.module-clock');
        if (el) {
          const clockRect = el.getBoundingClientRect();
          const rawWidth = clockRect.width / currentScale;
          const rawHeight = clockRect.height / currentScale;

          const rawBaseRadius = ((Math.max(rawWidth, rawHeight) / 2) + 20) * dpr;
          const rawTotalRadius = rawBaseRadius * (1 + maxVisualizerDisplacementRatio);

          let newScale = availableRadius / rawTotalRadius;
          if (newScale > 1.0) newScale = 1.0; // Scale down only to prevent overflow

          if (Math.abs(newScale - currentScale) > 0.001) {
            document.documentElement.style.setProperty('--composition-scale', String(newScale));
            geometryDirty = true; // Recalculate next frame for precise center
          } else {
            geometryDirty = false;
          }
          
          const clockCx = (clockRect.left - rect.left) + clockRect.width / 2;
          const clockCy = (clockRect.top - rect.top) + clockRect.height / 2;
          
          clockRadiusRef.current = rawBaseRadius * newScale;
          clockCenterRef.current = {
            x: clockCx * dpr,
            y: clockCy * dpr
          };
        } else {
          clockRadiusRef.current = availableRadius / (1 + maxVisualizerDisplacementRatio);
          clockCenterRef.current = { x: targetW / 2, y: targetH / 2 };
          geometryDirty = false;
        }
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      
      ctx.clearRect(0, 0, width, height);

      const attack = 60.0;
      const decay = 5.0;

      const sensitivity = sensitivityRef.current;

      // Temporal smoothing pass
      for (let i = 0; i < 64; i++) {
        const target = (targetBandsRef.current[i] || 0) * sensitivity;
        const current = smoothedBandsRef.current[i];
        
        const diff = target - current;
        if (diff > 0) {
          smoothedBandsRef.current[i] += diff * Math.min(attack * dt, 1.0);
        } else {
          smoothedBandsRef.current[i] += diff * Math.min(decay * dt, 1.0);
        }
      }

      // Spatial smoothing pass (5-tap filter)
      let hasEnergy = false;
      let overallEnergy = 0;
      const renderedBands = new Float32Array(64);
      
      for (let i = 0; i < 64; i++) {
        const val_m2 = smoothedBandsRef.current[Math.max(0, i - 2)];
        const val_m1 = smoothedBandsRef.current[Math.max(0, i - 1)];
        const val_0  = smoothedBandsRef.current[i];
        const val_p1 = smoothedBandsRef.current[Math.min(63, i + 1)];
        const val_p2 = smoothedBandsRef.current[Math.min(63, i + 2)];
        
        const blurred = (val_m2 * 0.1) + (val_m1 * 0.2) + (val_0 * 0.4) + (val_p1 * 0.2) + (val_p2 * 0.1);
        renderedBands[i] = blurred;
        
        overallEnergy += blurred;
        if (blurred > 0.01) {
          hasEnergy = true;
        }
      }
      overallEnergy /= 64;

      const baseRadius = clockRadiusRef.current;
      const maxDisplacement = baseRadius * 0.5;

      const cx = clockCenterRef.current.x;
      const cy = clockCenterRef.current.y;

      ctx.beginPath();
      ctx.lineJoin = 'round';
      
      const segments = segmentsRef.current;
      for (let i = 0; i <= segments; i++) {
        const idx = i === segments ? 0 : i;
        const angle = (i / segments) * Math.PI * 2 + Math.PI / 2;
        
        const symIdx = idx <= (segments / 2) ? idx : segments - idx;
        const bandRatio = symIdx / (segments / 2);
        
        const exactIdx = Math.min(Math.pow(bandRatio, 1.2) * 63, 63);
        const idx1 = Math.floor(exactIdx);
        const idx2 = Math.min(idx1 + 1, 63);
        const fraction = exactIdx - idx1;
        
        // Linear interpolation across smoothed bins
        const val = renderedBands[idx1] * (1 - fraction) + renderedBands[idx2] * fraction;

        // Compression absolutely guarantees visualizer stays within bounds
        const compressedVal = Math.tanh(val);
        const r = baseRadius + (compressedVal * maxDisplacement);

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      
      const accent = accentColorRef.current;

      ctx.shadowBlur = (hasEnergy ? 30 : 5) * dpr;
      ctx.shadowColor = accent;
      
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3.0 * dpr;
      
      ctx.globalAlpha = 0.4 + (overallEnergy * 1.5);
      if (ctx.globalAlpha > 1.0) ctx.globalAlpha = 1.0;

      ctx.stroke();

      ctx.globalAlpha = 0.02 + (overallEnergy * 0.15);
      ctx.fillStyle = accent;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('transitionstart', onTransitionStart);
      window.removeEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('transitioncancel', onTransitionCancel);
      unsubStore();
      unlistenPromise.then(unlisten => unlisten());
      invoke('set_audio_active', { active: false }).catch(() => {});
    };
  }, [config.enabled]);

  if (!config.enabled) return null;

  return (
    <div className="aura-engine">
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />
    </div>
  );
};
