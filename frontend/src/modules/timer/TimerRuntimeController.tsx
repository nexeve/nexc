import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../state/store';
import { readFile } from '@tauri-apps/plugin-fs';
import alarmsData from './alarms.json';

let sharedAudioContext: AudioContext | null = null;
const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

export const TimerRuntimeController: React.FC = () => {
  const { state, endTime } = useAppStore(s => s.runtime.timer);
  const timerComplete = useAppStore(s => s.timerComplete);
  
  const alarmSound = useAppStore(s => s.config.timerAlarmSound) || 'soft';
  const customAlarmPath = useAppStore(s => s.config.timerCustomAlarmPath);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const alarmTimeoutRef = useRef<number | undefined>(undefined);

  // Background runtime tick for hidden completion
  useEffect(() => {
    if (state === 'running') {
      const interval = setInterval(() => {
        const remainingMs = endTime - Date.now();
        if (remainingMs <= 0) {
          timerComplete();
        }
      }, 500); // Check twice a second
      return () => clearInterval(interval);
    }
  }, [state, endTime, timerComplete]);

  // Resolve alarm audio source
  useEffect(() => {
    let active = true;
    const resolveSrc = async () => {
      try {
        let arrayBuffer: ArrayBuffer;
        if (alarmSound === 'custom' && customAlarmPath) {
          const bytes = await readFile(customAlarmPath);
          arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        } else {
          const dataUrl = (alarmsData as Record<string, string>)[alarmSound] || (alarmsData as Record<string, string>)['soft'];
          const res = await fetch(dataUrl);
          arrayBuffer = await res.arrayBuffer();
        }
        
        const ctx = getAudioContext();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        
        if (active) setAudioBuffer(buffer);
      } catch (e) {
        console.error('[TimerRuntime] Failed to decode audio:', e);
        if (alarmSound === 'custom' && active) {
          try {
            const dataUrl = (alarmsData as Record<string, string>)['soft'];
            const res = await fetch(dataUrl);
            const fallbackBuffer = await res.arrayBuffer();
            const ctx = getAudioContext();
            const decodedFallback = await ctx.decodeAudioData(fallbackBuffer);
            if (active) setAudioBuffer(decodedFallback);
          } catch(err) {
            console.error('[TimerRuntime] Failed to decode fallback audio:', err);
          }
        }
      }
    };
    resolveSrc();
    return () => { active = false; };
  }, [alarmSound, customAlarmPath]);

  const stopAndClearAlarm = useCallback(() => {
    if (alarmTimeoutRef.current !== undefined) {
      window.clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = undefined;
    }
    if (activeSourceNodeRef.current) {
      activeSourceNodeRef.current.onended = null;
      try {
        activeSourceNodeRef.current.stop();
      } catch (e) {}
      activeSourceNodeRef.current.disconnect();
      activeSourceNodeRef.current = null;
    }
  }, []);

  // Handle playing audio loop securely when state changes
  useEffect(() => {
    if (state !== 'completed' || !audioBuffer) {
      stopAndClearAlarm();
      return;
    }

    let active = true;

    const playLoop = () => {
      if (!active || state !== 'completed' || !audioBuffer) return;
      
      stopAndClearAlarm();
      
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error('[TimerRuntime] Failed to resume audio context:', e));
      }
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeSourceNodeRef.current = source;
      
      source.onended = () => {
        if (!active || state !== 'completed') {
          stopAndClearAlarm();
          return;
        }
        alarmTimeoutRef.current = window.setTimeout(() => {
          if (active && state === 'completed') {
            playLoop();
          }
        }, 1500);
      };
      
      source.start();
    };

    playLoop();

    return () => {
      active = false;
      stopAndClearAlarm();
    };
  }, [state, audioBuffer, stopAndClearAlarm]);

  return null;
};
