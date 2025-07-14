import React from 'react';

interface DividerProps {
  text?: string;
}

export const Divider: React.FC<DividerProps> = ({ text }) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 h-[1px]" />
      </div>
      {text && (
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500 font-medium">{text}</span>
        </div>
      )}
    </div>
  );
}; 