import React from 'react';
import './MaterialWrapper.css';

type MaterialType = 'void' | 'scrim' | 'glass' | 'solid';

interface MaterialWrapperProps {
  material: MaterialType;
  children: React.ReactNode;
}

export const MaterialWrapper: React.FC<MaterialWrapperProps> = ({ material, children }) => {
  return (
    <div className={`material-wrapper material-${material}`}>
      {children}
    </div>
  );
};
