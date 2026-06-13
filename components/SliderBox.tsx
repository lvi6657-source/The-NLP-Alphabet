
import React, { useRef, useCallback, useState } from 'react';
import type { SliderConfig, SliderType } from '../types';

interface SliderBoxProps {
    type: SliderType;
    value: number;
    config: SliderConfig;
    onValueChange: (type: SliderType, value: number) => void;
    isDisabled?: boolean;
    onTap?: (type: SliderType) => void;
    labelOverride?: string;
    infinityThreshold?: number;
}

export const SliderBox: React.FC<SliderBoxProps> = ({ type, value, config, onValueChange, isDisabled = false, onTap, labelOverride, infinityThreshold }) => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const touchState = useRef({ active: false, startX: 0, startValue: 0, moved: false });
    const [isAdjusting, setIsAdjusting] = useState(false);

    const labels = {
        dur: 'Время показа',
        speed: 'Скорость (сек)',
        dec: 'Ускорение',
        int: 'Интервал (сек)',
        r_min: 'Мин. задержка',
        r_max: 'Макс. задержка',
        r_show: 'Время показа',
    };
    
    const labelText = labelOverride || labels[type];

    const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
        if (!touchState.current.active || !sliderRef.current) return;

        if (!touchState.current.moved && Math.abs(e.touches[0].clientX - touchState.current.startX) > 5) {
            touchState.current.moved = true;
            setIsAdjusting(true);
        }

        if (touchState.current.moved) {
            e.preventDefault();
        } else {
            return;
        }

        const rect = sliderRef.current.getBoundingClientRect();
        const deltaX = e.touches[0].clientX - touchState.current.startX;
        const sensitivity = 0.165; // Reduced from 0.33
        const range = config.max - config.min;
        const valueChange = (deltaX / rect.width) * range * sensitivity;
        
        let newValue = touchState.current.startValue + valueChange;
        newValue = Math.max(config.min, Math.min(config.max, newValue));
        
        onValueChange(type, newValue);
    }, [config, onValueChange, type]);

    const handleGlobalTouchEnd = useCallback(() => {
        if (!touchState.current.moved && onTap) {
            onTap(type);
        }
        
        if (touchState.current.active) {
             sliderRef.current?.classList.remove('bg-neutral-600');
        }

        touchState.current.active = false;
        touchState.current.moved = false;
        setIsAdjusting(false);

        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
    }, [handleGlobalTouchMove, onTap, type]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        // CRITICAL: Stop propagation so we don't trigger the Footer's background tap
        e.stopPropagation();

        if (isDisabled && !onTap) return;

        if (!isDisabled) {
            touchState.current.active = true;
            touchState.current.startX = e.touches[0].clientX;
            touchState.current.startValue = value;
            sliderRef.current?.classList.add('bg-neutral-600');
        }
        
        touchState.current.moved = false;

        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);
    };

    const handleStep = (direction: 'inc' | 'dec') => {
        if (isDisabled) return;

        let currentValue = value;
        let newValue = direction === 'inc' ? currentValue + config.step : currentValue - config.step;
        newValue = Math.max(config.min, Math.min(config.max, newValue));
        onValueChange(type, newValue);
    };

    const handleIncrement = (e: React.TouchEvent) => {
        e.stopPropagation();
        handleStep('inc');
    };

    const handleDecrement = (e: React.TouchEvent) => {
        e.stopPropagation();
        handleStep('dec');
    };


    const percentage = ((value - config.min) / (config.max - config.min)) * 100;
    
    const isInfinity = infinityThreshold !== undefined && value >= infinityThreshold;
    const formattedValue = isInfinity ? '∞' : config.format(value);


    return (
        <div
            ref={sliderRef}
            className={`relative h-14 bg-neutral-700 rounded-xl flex items-center justify-center overflow-hidden select-none transition-opacity
                ${isDisabled ? 'opacity-40' : 'cursor-ew-resize'}
                ${onTap ? 'cursor-pointer' : ''}`}
            onTouchStart={handleTouchStart}
        >
            <div
                className="absolute left-0 top-0 h-full bg-green-500/25 pointer-events-none"
                style={{ width: `${percentage}%` }}
            ></div>
            
            <div
                className="absolute left-0 top-0 h-full w-8 flex items-center justify-center z-20 text-neutral-400 text-2xl font-light active:bg-neutral-600/50 rounded-l-xl"
                onTouchStart={handleDecrement}
            >
                -
            </div>

            <div className="flex flex-col items-center justify-center pointer-events-none">
                <span className={`relative z-10 text-xs text-neutral-400 uppercase tracking-wider transition-opacity duration-150 ${isAdjusting ? 'opacity-0' : 'opacity-100'}`}>{labelText}</span>
                <span className={`relative z-10 font-semibold text-neutral-100 transition-all duration-150 ${isAdjusting ? 'text-4xl -translate-y-2' : 'text-lg'}`}>{formattedValue}</span>
            </div>

            <div
                className="absolute right-0 top-0 h-full w-8 flex items-center justify-center z-20 text-neutral-400 text-2xl font-light active:bg-neutral-600/50 rounded-r-xl"
                onTouchStart={handleIncrement}
            >
                +
            </div>
        </div>
    );
};
