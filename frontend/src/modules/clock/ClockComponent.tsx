import React, { useState, useEffect } from 'react';
import type { ModuleInstance } from '../../core/types';
import './ClockModule.css';

export const ClockComponent: React.FC<{ instance: ModuleInstance }> = ({ instance }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (instance.config?.format as string) || '12h';
  const is12h = format === '12h';
  
  let h = time.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  
  if (is12h) {
    h = h % 12;
    if (h === 0) h = 12; // 12 AM or 12 PM
  }

  const hours = h.toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  
  // Optional: blinking colon or just static
  const showColon = time.getSeconds() % 2 === 0;

  return (
    <div className="module-clock">
      <span className="clock-hours">{hours}</span>
      <span className="clock-colon" style={{ opacity: showColon ? 1 : 0.5 }}>:</span>
      <span className="clock-minutes">{minutes}</span>
      {is12h && <span className="clock-ampm">{ampm}</span>}
    </div>
  );
};
