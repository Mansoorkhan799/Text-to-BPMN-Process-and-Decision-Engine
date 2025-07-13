'use client';

import React from 'react';

type SwitchProps = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
};

export const Switch = ({
    checked,
    onCheckedChange,
    size = 'md',
    disabled = false
}: SwitchProps) => {
    const getSize = () => {
        switch (size) {
            case 'sm':
                return { wrapper: 'w-8 h-4', circle: 'w-3 h-3', translate: 'translate-x-4' };
            case 'lg':
                return { wrapper: 'w-14 h-7', circle: 'w-6 h-6', translate: 'translate-x-7' };
            default: // md
                return { wrapper: 'w-11 h-6', circle: 'w-5 h-5', translate: 'translate-x-5' };
        }
    };

    const { wrapper, circle, translate } = getSize();

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onCheckedChange(!checked)}
            className={`
        ${wrapper} 
        relative inline-flex flex-shrink-0 border-2 border-transparent rounded-full 
        transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-blue-500
        ${checked ? 'bg-blue-600' : 'bg-gray-200'} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            <span
                className={`
          ${circle} 
          rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
          ${checked ? translate : 'translate-x-0'}
        `}
            />
        </button>
    );
};

export default Switch; 