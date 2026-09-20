import React, { useState, useEffect } from 'react';
import type { ModuleInstance } from '../../core/types';
import './DateModule.css';

export const DateComponent: React.FC<{ instance: ModuleInstance }> = ({ instance: _instance }) => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    // Update every minute is enough for date
    const timer = setInterval(() => {
      setDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const weekday = date.toLocaleDateString([], { weekday: 'long' });
  const month = date.toLocaleDateString([], { month: 'short' });
  const day = date.getDate();

  return (
    <div className="module-date">
      <span className="date-weekday">{weekday}</span>
      <span className="date-separator">·</span>
      <span className="date-month-day">{month} {day}</span>
    </div>
  );
};
