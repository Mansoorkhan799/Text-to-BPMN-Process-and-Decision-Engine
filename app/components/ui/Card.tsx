import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md ${className}`}>
      {title && (
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}; 