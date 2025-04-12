import React from 'react';

interface DividerProps {
  text?: string;
}

export const Divider: React.FC<DividerProps> = ({ text }) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      {text && (
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{text}</span>
        </div>
      )}
    </div>
  );
}; 