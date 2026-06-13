
import React, { useRef, useState, useEffect } from 'react';

interface RGBSliderProps {
    type: 'r' | 'g' | 'b';
    value: number;
    onChange: (value: number) => void;
    onActive: (isActive: boolean) => void;
    className?: string;
}

export const RGBSlider: React.FC<RGBSliderProps> = ({ type, value, onChange, onActive, className = '' }) => {
    const [interaction, setInteraction] = useState<'dec' | 'inc' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const valueRef = useRef(value);
    const isInteractingRef = useRef(false);
    const directionRef = useRef<'dec' | 'inc' | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    // UNITS PER SECOND. Reduced sensitivity.
    const SPEED_PER_SECOND = 20; 

    // Colors for the fill bar
    const getFillColor = () => {
        switch (type) {
            case 'r': return 'rgb(255, 0, 0)'; 
            case 'g': return 'rgb(0, 255, 0)'; 
            case 'b': return 'rgb(0, 0, 255)'; 
        }
    };

    // Sync ref with prop only when NOT interacting
    useEffect(() => {
        if (!isInteractingRef.current) {
            valueRef.current = value;
        }
    }, [value]);

    const animate = (time: number) => {
        if (!isInteractingRef.current || !directionRef.current) return;

        if (lastTimeRef.current === null) {
            lastTimeRef.current = time;
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const deltaTime = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const directionMultiplier = directionRef.current === 'inc' ? 1 : -1;
        const change = SPEED_PER_SECOND * deltaTime * directionMultiplier;
        
        valueRef.current += change;

        // Clamp
        if (valueRef.current > 255) valueRef.current = 255;
        if (valueRef.current < 0) valueRef.current = 0;
        
        const roundedValue = Math.round(valueRef.current);
        onChange(roundedValue);
        
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const startInteraction = (dir: 'dec' | 'inc') => {
        if (isInteractingRef.current) return;
        
        isInteractingRef.current = true;
        directionRef.current = dir; 
        setInteraction(dir); 
        onActive(true);
        
        lastTimeRef.current = null;
        valueRef.current = value;

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    const stopInteraction = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        isInteractingRef.current = false;
        directionRef.current = null;
        lastTimeRef.current = null;
        setInteraction(null);
        onActive(false);
    };

    useEffect(() => {
        if (interaction) {
            const handleGlobalEnd = () => stopInteraction();
            window.addEventListener('touchend', handleGlobalEnd, { passive: false });
            window.addEventListener('mouseup', handleGlobalEnd);
            return () => {
                window.removeEventListener('touchend', handleGlobalEnd);
                window.removeEventListener('mouseup', handleGlobalEnd);
                stopInteraction();
            };
        }
    }, [interaction]);

    const safeValue = isNaN(value) ? 0 : value;
    const tickPercent = (safeValue / 255) * 100;
    const displayValue = Math.round(isInteractingRef.current ? valueRef.current : safeValue);
    const opacity = safeValue / 255;

    return (
        <div 
            ref={containerRef}
            className={`relative w-full overflow-hidden select-none touch-none bg-white rounded-xl ${className}`}
            onTouchStart={(e) => e.stopPropagation()} 
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Color Saturation Layer - Full width, opacity changes */}
            <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-75"
                style={{ backgroundColor: getFillColor(), opacity: opacity }}
            />
            
            {/* The Tick Mark (Black thin line) */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-black z-10 pointer-events-none"
                style={{ left: `${tickPercent}%` }}
            />

            {/* Idle Value (Center) */}
            {!interaction && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <span className="text-2xl font-bold text-black font-mono tracking-tighter">
                        {displayValue}
                    </span>
                </div>
            )}

            {/* Interaction Values (Sides) */}
            {interaction && (
                <div className="absolute inset-0 flex items-center z-20 pointer-events-none">
                    <div className={`w-1/2 flex items-center justify-center transition-opacity duration-75 ${interaction === 'inc' ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-2xl font-bold text-black font-mono tracking-tighter">
                            {displayValue}
                        </span>
                    </div>
                    <div className={`w-1/2 flex items-center justify-center transition-opacity duration-75 ${interaction === 'dec' ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-2xl font-bold text-black font-mono tracking-tighter">
                            {displayValue}
                        </span>
                    </div>
                </div>
            )}

            {/* Interaction Zones */}
            <div className="absolute inset-0 flex z-30">
                <div 
                    className="flex-1"
                    onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); startInteraction('dec'); }}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startInteraction('dec'); }}
                />
                <div 
                    className="flex-1"
                    onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); startInteraction('inc'); }}
                     onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startInteraction('inc'); }}
                />
            </div>
        </div>
    );
};
