
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SliderBox } from './components/SliderBox';
import { RGBSlider } from './components/RGBSlider';
import { SLIDER_CONFIG, RUSSIAN_ALPHABET, RUSSIAN_ALPHABET_NO_HARD, ACTIONS, ACTIONS_4, STORAGE_KEY, DEFAULT_COLORS, DEFAULT_COLOR_PALETTE, ACTION_LABELS, NUMBERS, STIMULUS_MODES, MEMORY_SEQUENCE_LENGTHS, COLOR_NAMES, DIRECTIONS } from './constants';
import type { AppState, SliderType, Stimulus, StimulusMode, MemorySequenceLength, ArrowMode } from './types';

const DEFAULT_GRID_FONT_SIZES: Record<number, number> = {
    4: 18, 6: 15, 9: 11, 12: 8, 20: 6, 24: 5.5, 30: 4.5, 35: 4, 48: 3.5, 54: 3.2, 70: 2.8, 77: 2.6, 108: 2.1, 117: 2.0, 140: 1.7, 150: 1.6
};

// RGB Helper utilities
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
};

const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (c: number) => {
        const hex = Math.round(c).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};


const App: React.FC = () => {
    const getDefaultState = (): AppState => ({
        isRunning: false,
        counter: 0,
        baseSpeed: 1.0,
        currentDelay: 1000,
        decrement: 0,
        interval: 0,
        displayDuration: 0.15,
        isDisplayActive: true,
        fontSizeVh: 25,
        lineSpacingEm: 0,
        positionOffset: 25,
        letter: 'А',
        action: 'Л',
        isLetterVisible: true,
        displayMode: 'reaction',
        contentMode: 'letter',
        circleColor: DEFAULT_COLOR_PALETTE[0],
        colors: DEFAULT_COLORS,
        isAccelerationActive: true,
        isFocusDotVisible: false,
        reactionState: {
            isRunning: false,
            gridSize: 4,
            activeQuadrant: null,
            expectedQuadrant: null,
            activeColor: 'transparent',
            isWaitingForInput: false,
            roundStartTime: null,
            roundCount: 0,
            totalReactionTime: 0,
            avgReactionTime: 0,
            bestReactionTime: 0,
            avgReactionTimeLast20: 0,
            last20Reactions: [],
            errorFlash: false,
            successFlashQuadrant: null,
            successFlashColor: 'transparent',
            stimulusMode: 'цвет',
            isMemoryMode: false,
            memorySequenceLength: 2,
            activeText: null,
            sequence: [],
            isShowingSequence: false,
            playerInputIndex: 0,
            simpleModeSettings: {
                minDelay: 0.5,
                maxDelay: 2.0,
                isFixedDelay: false,
                showTime: 0.2,
                isShowTimeLinkedToDelay: false,
            },
            memoryModeSettings: {
                minDelay: 0.8,
                maxDelay: 2.0,
                isFixedDelay: true,
                showTime: 0.5,
                isShowTimeLinkedToDelay: false,
            },
            observationModeSettings: {
                minDelay: 0.5,
                maxDelay: 2.0,
                isFixedDelay: false,
                showTime: 0.2,
                isShowTimeLinkedToDelay: false,
            },
            isObservationMode: false,
            gridBrightness: 1,
            gridFontSizes: { ...DEFAULT_GRID_FONT_SIZES },
            isGridVisible: true,
            isMovingDotActive: false,
            dotSpeed: 25,
            dotPosition: { x: 50, y: 50 },
            dotVelocity: { vx: 0, vy: 0 },
        },
        isColorEditorVisible: false,
        colorPalette: [...DEFAULT_COLOR_PALETTE],
        isColorModeSettingsActive: false,
        arrowMode: 'off',
        randomArrowDirection: 'up',
        arrowSide: 'left',
        excludeHardLetters: false,
        useFourArrows: false,
        repeatChance: 100,
        customActionsLetters: { 'Л': '', 'П': '', 'О': '', 'В': '' },
        customActionsArrows: { 'Л': '', 'П': '', 'О': '', 'В': '' },
        backgroundMode: 'dark', // 'black', 'dark', 'gray'
    });
    
    const [state, setState] = useState<AppState>(() => {
        try {
            const savedStateJSON = localStorage.getItem(STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                 if (!savedState || typeof savedState !== 'object') {
                    localStorage.removeItem(STORAGE_KEY);
                    return getDefaultState();
                }

                const defaultState = getDefaultState();
                
                // --- Clean up deprecated top-level states ---
                delete savedState.attentionState;

                // --- Migration Logic ---
                let reactionSettings = {};
                if (savedState.reactionState) {
                    const rs = savedState.reactionState;
                    
                    // Migrate independent settings
                    if (rs.simpleModeSettings && rs.memoryModeSettings) {
                        Object.assign(reactionSettings, {
                            simpleModeSettings: rs.simpleModeSettings,
                            memoryModeSettings: rs.memoryModeSettings,
                            observationModeSettings: rs.observationModeSettings || defaultState.reactionState.observationModeSettings,
                        });
                    } else { // Migrate from old flat structure
                        Object.assign(reactionSettings, {
                            simpleModeSettings: {
                                minDelay: rs.minDelay || defaultState.reactionState.simpleModeSettings.minDelay,
                                maxDelay: rs.maxDelay || defaultState.reactionState.simpleModeSettings.maxDelay,
                                isFixedDelay: rs.isFixedDelay || false,
                                showTime: rs.showTime || defaultState.reactionState.simpleModeSettings.showTime,
                                isShowTimeLinkedToDelay: rs.isshowTimeLinkedToDelay || rs.isShowTimeLinkedToDelay || false, // Fix typo on load
                            },
                             memoryModeSettings: defaultState.reactionState.memoryModeSettings,
                             observationModeSettings: defaultState.reactionState.observationModeSettings,
                        });
                    }

                    const validGridSizes = [4, 6, 9, 12, 20, 24, 30, 35, 48, 54, 70, 77, 108, 117, 140, 150];
                    const loadedGridSize = validGridSizes.includes(rs.gridSize) ? rs.gridSize : 4;
                    
                    let gridFontSizes = { ...DEFAULT_GRID_FONT_SIZES, ...(rs.gridFontSizes || {}) };
                    if (rs.gridFontSizeVh) { // if old property exists, migrate it
                        gridFontSizes[loadedGridSize] = rs.gridFontSizeVh;
                    }


                    reactionSettings = {
                        ...reactionSettings,
                        gridSize: loadedGridSize,
                        isObservationMode: rs.isObservationMode ?? false,
                        gridBrightness: rs.gridBrightness ?? 1,
                        gridFontSizes: gridFontSizes,
                        isGridVisible: rs.isGridVisible ?? true,
                        isMovingDotActive: rs.isMovingDotActive ?? false, // Load new setting
                        dotSpeed: rs.dotSpeed ?? 25,
                    };


                    // Migrate from old `submode` to new structure
                    if (rs.submode) {
                        let submodeStr = String(rs.submode);
                        if (submodeStr === 'два') submodeStr = 'обе'; // Migration: два -> обе
                        const parsedNum = parseInt(submodeStr, 10);
                        const isMemory = !isNaN(parsedNum);
                        
                        const memLength = MEMORY_SEQUENCE_LENGTHS.find(l => l === parsedNum) ?? 2;

                        Object.assign(reactionSettings, {
                            isMemoryMode: isMemory,
                            stimulusMode: isMemory ? 'все' : (STIMULUS_MODES.includes(submodeStr as StimulusMode) ? submodeStr : 'цвет'),
                            memorySequenceLength: isMemory ? memLength : 2,
                        });
                    } else { // Handle states that might not have submode
                         let stimulusMode = rs.stimulusMode || 'цвет';
                         if (stimulusMode === 'два') stimulusMode = 'обе'; // Migration: два -> обе
                         Object.assign(reactionSettings, {
                            isMemoryMode: rs.isMemoryMode || false,
                            stimulusMode: stimulusMode,
                            memorySequenceLength: rs.memorySequenceLength || 2
                        });
                    }
                }
                // --- End Migration ---

                // Force palette reset if length is different (migration to 7 colors)
                const savedPalette = savedState.colorPalette;
                const finalPalette = (savedPalette && savedPalette.length === 7) ? savedPalette : [...DEFAULT_COLOR_PALETTE];
                
                // Migrate arrowMode
                const migratedArrowMode: ArrowMode = savedState.arrowMode 
                    ? savedState.arrowMode 
                    : (savedState.isArrowsMode ? 'inside' : 'off');

                // Migrate isFocusDotVisible (Pull from reactionState or use root)
                const isFocusDotVisible = savedState.isFocusDotVisible ?? savedState.reactionState?.isFocusDotVisible ?? false;
                
                // Migrate colors to include 'В' if missing
                const colors = savedState.colors || DEFAULT_COLORS;
                if (!colors['В']) {
                    colors['В'] = DEFAULT_COLORS['В'];
                }

                // Migrate new features
                const customActionsLetters = savedState.customActionsLetters || { 'Л': '', 'П': '', 'О': '', 'В': '' };
                // Migration: If old customActions existed, maybe move to Letters? Or just reset. Safe to reset.
                const customActionsArrows = savedState.customActionsArrows || { 'Л': '', 'П': '', 'О': '', 'В': '' };

                const repeatChance = savedState.repeatChance !== undefined ? savedState.repeatChance : 100;
                // Migrate background: boolean to mode string
                let backgroundMode = 'dark';
                if (savedState.isTrueBlack === true) backgroundMode = 'black';
                else if (savedState.backgroundMode) backgroundMode = savedState.backgroundMode;

                return { 
                    ...defaultState, 
                    ...savedState,
                    isFocusDotVisible: isFocusDotVisible,
                    contentMode: savedState.contentMode || 'letter',
                    displayMode: savedState.displayMode === 'attention' ? 'reaction' : savedState.displayMode || 'reaction',
                    reactionState: { ...defaultState.reactionState, ...reactionSettings },
                    isRunning: false, 
                    counter: 0, 
                    currentDelay: savedState.baseSpeed * 1000,
                    isColorEditorVisible: false, // Don't persist editor visibility
                    colorPalette: finalPalette,
                    colors: colors,
                    circleColor: savedState.circleColor || DEFAULT_COLOR_PALETTE[0],
                    isColorModeSettingsActive: false,
                    arrowMode: migratedArrowMode,
                    randomArrowDirection: savedState.randomArrowDirection || 'up',
                    arrowSide: 'left', // Default
                    excludeHardLetters: savedState.excludeHardLetters ?? false,
                    useFourArrows: savedState.useFourArrows ?? false,
                    repeatChance,
                    customActionsLetters,
                    customActionsArrows,
                    backgroundMode: backgroundMode as 'black' | 'dark' | 'gray',
                };
            }
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
        }
        return getDefaultState();
    });

    const [toast, setToast] = useState<{ el: 'fs' | 'ls' | 'reset', text: string, visible: boolean }>({ el: 'fs', text: '', visible: false });
    const [isAdjustingGridFontSize, setIsAdjustingGridFontSize] = useState(false);
    
    // New State for Color Editor
    const [activeEditorColorIndex, setActiveEditorColorIndex] = useState(0);
    const [activeSlider, setActiveSlider] = useState<'r' | 'g' | 'b' | null>(null);

    // New State for Gesture Visibility (Fixes ghosting of 'L'/'P')
    const [isGestureActive, setIsGestureActive] = useState(false);

    // 0 = Full Visible, 1 = Transparent BG, 2 = Hidden
    const [controlsVisibilityMode, setControlsVisibilityMode] = useState<0 | 1 | 2>(0);

    const timers = useRef<{ main: number | null; accel: number | null; hide: number | null, toast: number | null, reactionDelay: number | null, reactionShow: number | null, successFlash: number | null }>({ main: null, accel: null, hide: null, toast: null, reactionDelay: null, reactionShow: null, successFlash: null });
    
    // Gesture Ref (mode added to properly track display mode in callbacks)
    const gestureState = useRef<{ active: boolean; startX: number; startY: number; startF: number; startL: number; startPO: number; lock: null | 'vert' | 'horz'; hasMoved: boolean; mode: AppState['displayMode'] }>({ active: false, startX: 0, startY: 0, startF: 0, startL: 0, startPO: 0, lock: null, hasMoved: false, mode: 'default' });
    const globalLongPressTimer = useRef<number | null>(null);
    const globalLongPressFired = useRef(false);
    
    const reactionGestureState = useRef<{ active: boolean; startY: number; startX: number; startBrightness: number; startFontSize: number; hasMoved: boolean; lock: null | 'vert' | 'horz'; }>({ active: false, startY: 0, startX: 0, startBrightness: 1, startFontSize: 10, hasMoved: false, lock: null });
    const tapState = useRef<{ lastTap: number; timer: number | null }>({ lastTap: 0, timer: null });
    const reactionRunningRef = useRef(false);
    const longPressTimer = useRef<number | null>(null);
    const longPressActionFired = useRef(false);
    const previewChars = useRef<string[]>([]);
    
    // Refs for moving dot animation
    const animationFrameId = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);
    
    // Refs for Color Editor Gestures
    const editorTapState = useRef<{ lastTap: number; timer: number | null }>({ lastTap: 0, timer: null });
    const editorLongPressTimer = useRef<number | null>(null);
    const editorBgPressedRef = useRef(false);


    const { isMemoryMode, isObservationMode } = state.reactionState;
    const settingsKey = isMemoryMode ? 'memoryModeSettings' : isObservationMode ? 'observationModeSettings' : 'simpleModeSettings';
    const currentReactionSettings = state.reactionState[settingsKey];
    

    useEffect(() => {
        reactionRunningRef.current = state.reactionState.isRunning;
    }, [state.reactionState.isRunning]);


    const getRandom = useCallback(<T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)], []);

    // New Random Logic with Repeat Chance
    const getNextItem = useCallback(<T,>(arr: T[], currentItem: T | null): T => {
        let next = getRandom(arr);
        
        // If it's a repeat
        if (currentItem !== null && next === currentItem) {
            // Check probability
            // If repeatChance is 100, (1 > 1) is false, never retries. Accepts repeat.
            // If repeatChance is 0, (1 > 0) is true, always retries. Rejects repeat.
            // If repeatChance is 50, (rand > 0.5), 50% chance to retry.
            if (Math.random() > (state.repeatChance / 100)) {
                // Pick from others to ensure difference
                const others = arr.filter(i => i !== currentItem);
                if (others.length > 0) {
                    next = getRandom(others);
                }
            }
        }
        return next;
    }, [getRandom, state.repeatChance]);


    const getCurrentAlphabet = useCallback(() => {
        return state.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
    }, [state.excludeHardLetters]);

    const getCurrentActions = useCallback(() => {
        return state.useFourArrows ? ACTIONS_4 : ACTIONS;
    }, [state.useFourArrows]);


    const vibrate = (ms: number) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(ms);
        }
    };

    const clearAllTimers = useCallback(() => {
        Object.values(timers.current).forEach(timer => {
            if (typeof timer === 'number') clearTimeout(timer);
        });
        timers.current = { main: null, accel: null, hide: null, toast: null, reactionDelay: null, reactionShow: null, successFlash: null };
    }, []);

    // MOVING DOT ANIMATION LOGIC (Used within Reaction Mode)
    const animationLoop = useCallback((timestamp: number) => {
        if (lastFrameTimeRef.current === null) {
            lastFrameTimeRef.current = timestamp;
            animationFrameId.current = requestAnimationFrame(animationLoop);
            return;
        }

        const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000; // in seconds
        lastFrameTimeRef.current = timestamp;

        setState(prevState => {
            if (!prevState.reactionState.isRunning || !prevState.reactionState.isMovingDotActive) {
                lastFrameTimeRef.current = null;
                return prevState;
            }

            let { x, y } = prevState.reactionState.dotPosition;
            let { vx, vy } = prevState.reactionState.dotVelocity;

            // Update velocity magnitude based on current speed setting, keeping direction
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            const targetSpeed = prevState.reactionState.dotSpeed;
            
            if (Math.abs(currentSpeed - targetSpeed) > 0.1 || currentSpeed === 0) {
                 if (currentSpeed === 0) {
                     const angle = Math.random() * 2 * Math.PI;
                     vx = Math.cos(angle) * targetSpeed;
                     vy = Math.sin(angle) * targetSpeed;
                 } else {
                     vx = (vx / currentSpeed) * targetSpeed;
                     vy = (vy / currentSpeed) * targetSpeed;
                 }
            }

            x += vx * deltaTime;
            y += vy * deltaTime;

            // Physics Logic: Bounce off walls
            // Added random jitter to avoid "rail sliding" (sticking parallel to walls)
            const jitter = () => (Math.random() - 0.5) * 10; 

            if (x <= 0) {
                x = 0;
                if (vx < 0) { 
                    vx = -vx; 
                    vy += jitter(); 
                }
            }
            if (x >= 100) {
                x = 100;
                if (vx > 0) { 
                    vx = -vx; 
                    vy += jitter();
                }
            }
            if (y <= 0) {
                y = 0;
                if (vy < 0) { 
                    vy = -vy; 
                    vx += jitter();
                }
            }
            if (y >= 100) {
                y = 100;
                if (vy > 0) { 
                    vy = -vy; 
                    vx += jitter();
                }
            }

            return {
                ...prevState,
                reactionState: {
                    ...prevState.reactionState,
                    dotPosition: { x, y },
                    dotVelocity: { vx, vy }
                }
            };
        });

        animationFrameId.current = requestAnimationFrame(animationLoop);
    }, []);

    // REACTION MODE LOGIC
    const startNextReactionRound = useCallback((delayOverride?: number) => {
        setState(prevState => {
            const currentSettings = prevState.reactionState[settingsKey];
            const { minDelay, maxDelay, isFixedDelay } = currentSettings;
            
            const delay = delayOverride !== undefined
                ? delayOverride
                : isFixedDelay ? minDelay : Math.random() * (maxDelay - minDelay) + minDelay;

            timers.current.reactionDelay = window.setTimeout(() => {
                if (!reactionRunningRef.current) return;

                // --- LOGIC TO SHOW STIMULUS AND SCHEDULE NEXT ROUND ---
                setState(s => {
                    const { stimulusMode, gridSize, activeQuadrant: prevQuad, activeColor: prevColor, activeText: prevText } = s.reactionState;
                    const currentAlphabet = s.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
                    
                    // If in observation mode, schedule the next round immediately.
                    // This ensures the interval is governed by `delay`, not user input.
                    if (s.reactionState.isRunning && s.reactionState.isObservationMode && !s.reactionState.isMemoryMode) {
                        // Use a microtask to schedule the next call after this state update has been processed.
                        queueMicrotask(() => startNextReactionRound());
                    }

                    // Use getNextItem for quadrant
                    const allQuadrants = Array.from({ length: gridSize }, (_, i) => i);
                    const nextQuadrant = getNextItem(allQuadrants, prevQuad);
                    
                    let nextColor = 'transparent';
                    let nextText: string | null = null;
                    
                    const stimulusTypesAll: Stimulus['type'][] = ['color', 'digit', 'letter'];
                    const stimulusTypesTwo: Stimulus['type'][] = ['digit', 'letter'];
                    let selectedType: Stimulus['type'];

                    if (stimulusMode === 'все') {
                        selectedType = getRandom(stimulusTypesAll);
                    } else if (stimulusMode === 'обе') {
                        selectedType = getRandom(stimulusTypesTwo);
                    } else if (stimulusMode === 'цвет') {
                        selectedType = 'color';
                    } else if (stimulusMode === 'цифра') {
                        selectedType = 'digit';
                    } else { // 'буква'
                        selectedType = 'letter';
                    }

                    switch(selectedType) {
                        case 'color':
                            nextColor = getNextItem(s.colorPalette, prevColor === 'transparent' ? null : prevColor);
                            break;
                        case 'digit':
                            nextText = getNextItem(NUMBERS, prevText);
                            break;
                        case 'letter':
                            nextText = getNextItem(currentAlphabet, prevText);
                            break;
                    }
                    
                    const currentSettings = s.reactionState[settingsKey];
                    const { showTime, isShowTimeLinkedToDelay } = currentSettings;
                    const effectiveShowTime = isShowTimeLinkedToDelay ? currentSettings.minDelay : showTime;
                    const isInfiniteShow = isShowTimeLinkedToDelay ? false : showTime >= currentSettings.minDelay;

                    const hideDuration = isInfiniteShow ? delay : effectiveShowTime;

                    timers.current.reactionShow = window.setTimeout(() => {
                        if (!reactionRunningRef.current) return;
                        setState(hideState => ({ ...hideState, reactionState: { 
                            ...hideState.reactionState, 
                            activeQuadrant: null, 
                            activeText: null,
                        }}));
                    }, hideDuration * 1000);
                    

                    // Return the new state to show the stimulus.
                    return {
                        ...s,
                        reactionState: {
                            ...s.reactionState,
                            activeQuadrant: nextQuadrant,
                            expectedQuadrant: nextQuadrant,
                            activeColor: nextColor,
                            activeText: nextText,
                            isWaitingForInput: !s.reactionState.isObservationMode,
                            roundStartTime: Date.now()
                        }
                    };
                });
            }, Number(delay) * 1000);

            return prevState;
        });
    }, [getRandom, settingsKey, getNextItem]);
    
    const showSequenceStep = useCallback((index: number, sequence: Stimulus[]) => {
        if (index >= sequence.length || !reactionRunningRef.current) {
            setState(s => ({ ...s, reactionState: { ...s.reactionState, isShowingSequence: false }}));
            return;
        }

        const isLastStep = index === sequence.length - 1;
        const settings = state.reactionState.memoryModeSettings;
        const effectiveShowTime = settings.isShowTimeLinkedToDelay ? settings.minDelay : settings.showTime;
        const isInfiniteShow = settings.isShowTimeLinkedToDelay ? false : settings.showTime >= settings.minDelay;
        const stimulus = sequence[index];
        
        setState(s => ({ ...s, reactionState: {
            ...s.reactionState,
            activeQuadrant: stimulus.quadrant,
            activeColor: stimulus.type === 'color' ? stimulus.value : 'transparent',
            activeText: stimulus.type !== 'color' ? stimulus.value : null,
        }}));
        
        if (!isInfiniteShow) {
            timers.current.reactionShow = window.setTimeout(() => {
                if (!reactionRunningRef.current) return;
                setState(s => ({ ...s, reactionState: { ...s.reactionState, activeQuadrant: null, activeText: null }}));
                if (isLastStep) {
                    setState(s => ({ ...s, reactionState: { ...s.reactionState, isShowingSequence: false }}));
                }
            }, effectiveShowTime * 1000);
        } else if (isLastStep) { // If infinite and last step, need to manually clear it after delay
            timers.current.reactionShow = window.setTimeout(() => {
                 if (!reactionRunningRef.current) return;
                 setState(s => ({ ...s, reactionState: { ...s.reactionState, activeQuadrant: null, activeText: null, isShowingSequence: false }}));
            }, settings.minDelay * 1000);
        }


        if (!isLastStep) {
            timers.current.reactionDelay = window.setTimeout(() => {
                showSequenceStep(index + 1, sequence);
            }, settings.minDelay * 1000);
        }

    }, [state.reactionState.memoryModeSettings]);


    const startMemoryRound = useCallback(() => {
        setState(prevState => {
            if (!prevState.reactionState.isMemoryMode || !prevState.reactionState.isRunning) return prevState;

            const { memorySequenceLength, gridSize, stimulusMode } = prevState.reactionState;
            const currentAlphabet = prevState.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
            
            const newSequence: Stimulus[] = Array.from({ length: memorySequenceLength }, () => {
                const quadrant = Math.floor(Math.random() * gridSize);
                
                const stimulusTypesAll: Stimulus['type'][] = ['color', 'digit', 'letter'];
                const stimulusTypesTwo: Stimulus['type'][] = ['digit', 'letter'];
                let type: Stimulus['type'];
                
                if (stimulusMode === 'все') {
                    type = getRandom(stimulusTypesAll);
                } else if (stimulusMode === 'обе') {
                    type = getRandom(stimulusTypesTwo);
                } else if (stimulusMode === 'цвет') {
                    type = 'color';
                } else if (stimulusMode === 'цифра') {
                    type = 'digit';
                } else { // 'буква'
                    type = 'letter';
                }

                let value = '';
                if (type === 'color') value = getRandom(prevState.colorPalette);
                else if (type === 'digit') value = getRandom(NUMBERS);
                else if (type === 'letter') value = getRandom(currentAlphabet);
                return { quadrant, type, value };
            });
            
            showSequenceStep(0, newSequence);

            return {
                ...prevState,
                reactionState: {
                    ...prevState.reactionState,
                    sequence: newSequence,
                    isShowingSequence: true,
                    playerInputIndex: 0,
                    activeQuadrant: null,
                    activeText: null,
                }
            };
        });
    }, [getRandom, showSequenceStep]);


    const toggleReactionRun = useCallback(() => {
        vibrate(50);
        
        setState(s => {
            const isStarting = !s.reactionState.isRunning;
            if (isStarting) {
                let reactionStateUpdate = {
                    ...s.reactionState,
                    isRunning: true,
                    roundCount: 0,
                    totalReactionTime: 0,
                    avgReactionTime: 0,
                    bestReactionTime: 0,
                    avgReactionTimeLast20: 0,
                    last20Reactions: [],
                    activeQuadrant: null,
                    activeText: null,
                    isWaitingForInput: false,
                    sequence: [],
                    isShowingSequence: false,
                    playerInputIndex: 0,
                };
                
                // If moving dot is active, initialize it
                if (s.reactionState.isMovingDotActive) {
                    const angle = Math.random() * 2 * Math.PI;
                    const speed = s.reactionState.dotSpeed;
                    const newVx = Math.cos(angle) * speed;
                    const newVy = Math.sin(angle) * speed;
                    const startX = Math.random() * 80 + 10;
                    const startY = Math.random() * 80 + 10;
                    
                    lastFrameTimeRef.current = null;
                    animationFrameId.current = requestAnimationFrame(animationLoop);
                    
                    reactionStateUpdate = {
                        ...reactionStateUpdate,
                        dotPosition: { x: startX, y: startY },
                        dotVelocity: { vx: newVx, vy: newVy }
                    };
                }
                
                 return { ...s, reactionState: reactionStateUpdate };

            } else {
                clearAllTimers();
                if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
                return {
                    ...s,
                    reactionState: {
                        ...s.reactionState,
                        isRunning: false,
                        activeQuadrant: null,
                        activeText: null,
                        isWaitingForInput: false,
                    }
                };
            }
        });
    }, [clearAllTimers, animationLoop]);

    useEffect(() => {
        if (state.reactionState.isRunning && state.reactionState.roundCount === 0) {
            if (state.reactionState.isObservationMode && !state.reactionState.isMemoryMode) {
                startNextReactionRound(0);
            } else if (state.reactionState.isMemoryMode) {
                startMemoryRound();
            } else {
                startNextReactionRound(0);
            }
        }
    }, [state.reactionState.isRunning, state.reactionState.isMemoryMode, state.reactionState.isObservationMode, state.reactionState.roundCount, startMemoryRound, startNextReactionRound]);


    const handleQuadrantTap = useCallback((tappedIndex: number, e: React.TouchEvent<HTMLDivElement>) => {
        // In observation mode, or if game is stopped, let events bubble to the grid container
        // for gestures like stopping the game or toggling grid visibility.
        if (state.reactionState.isObservationMode || !state.reactionState.isRunning) {
            return;
        }

        // For active simple/memory modes, this is a gameplay tap.
        // Stop it from propagating to prevent grid gestures.
        e.stopPropagation();

        const { isMemoryMode } = state.reactionState;

        if (isMemoryMode) {
            const { isShowingSequence, sequence, playerInputIndex } = state.reactionState;
            if (isShowingSequence || playerInputIndex >= sequence.length) return;

            if (tappedIndex === sequence[playerInputIndex].quadrant) {
                // Correct tap in sequence
                vibrate(20);
                setState(s => ({
                    ...s, reactionState: {
                        ...s.reactionState,
                        successFlashQuadrant: tappedIndex,
                        successFlashColor: 'rgba(255, 255, 255, 0.5)',
                        playerInputIndex: s.reactionState.playerInputIndex + 1,
                    }
                }));

                timers.current.successFlash = window.setTimeout(() => setState(s => ({ ...s, reactionState: { ...s.reactionState, successFlashQuadrant: null }})), 38);

                if (playerInputIndex + 1 === sequence.length) {
                    // Sequence complete
                     window.setTimeout(() => {
                        setState(s => ({ ...s, reactionState: { ...s.reactionState, roundCount: s.reactionState.roundCount + 1 }}));
                        startMemoryRound();
                    }, 300);
                }
            } else {
                 // Incorrect tap in sequence
                vibrate(75);
                setState(s => ({ ...s, reactionState: { ...s.reactionState, errorFlash: true } }));
                window.setTimeout(() => {
                    setState(s => ({ ...s, reactionState: { ...s.reactionState, errorFlash: false } }));
                    startMemoryRound();
                }, 38);
            }

        } else { // Reaction modes
            if (!state.reactionState.isWaitingForInput) return;

            if (tappedIndex === state.reactionState.expectedQuadrant) {
                // Correct Tap
                const reactionTime = (Date.now() - state.reactionState.roundStartTime!) / 1000;
                
                const newRoundCount = state.reactionState.roundCount + 1;
                const newTotalReactionTime = state.reactionState.totalReactionTime + reactionTime;
                const newAvgReactionTime = newTotalReactionTime / newRoundCount;

                const oldBestTime = state.reactionState.bestReactionTime;
                const newBestTime = oldBestTime === 0 || reactionTime < oldBestTime ? reactionTime : oldBestTime;
                
                const newLast20Reactions = [...state.reactionState.last20Reactions, reactionTime].slice(-20);
                const sumLast20 = newLast20Reactions.reduce((sum, time) => sum + time, 0);
                const newAvgLast20 = sumLast20 / newLast20Reactions.length;
                
                setState(s => ({
                    ...s,
                    reactionState: {
                        ...s.reactionState,
                        roundCount: newRoundCount,
                        totalReactionTime: newTotalReactionTime,
                        avgReactionTime: newAvgReactionTime,
                        bestReactionTime: newBestTime,
                        last20Reactions: newLast20Reactions,
                        avgReactionTimeLast20: newAvgLast20,
                        isWaitingForInput: false,
                        activeQuadrant: null,
                        activeText: null,
                        successFlashQuadrant: tappedIndex,
                        successFlashColor: 'rgba(255, 255, 255, 0.5)',
                        successFlash: true
                    }
                }));

                window.setTimeout(() => {
                    setState(s => ({ ...s, reactionState: { ...s.reactionState, successFlashQuadrant: null }}));
                    startNextReactionRound();
                }, 38);

            } else {
                // Incorrect Tap - Skip round
                vibrate(75);
                setState(s => ({
                    ...s,
                    reactionState: {
                        ...s.reactionState,
                        errorFlash: true,
                        isWaitingForInput: false,
                        activeQuadrant: null,
                        activeText: null,
                    }
                }));
                window.setTimeout(() => {
                    setState(s => ({ ...s, reactionState: { ...s.reactionState, errorFlash: false } }));
                    startNextReactionRound();
                }, 38);
            }
        }
    }, [state.reactionState, startNextReactionRound, startMemoryRound]);


    // DEFAULT MODES LOGIC
    const tick = useCallback(() => {
        if (timers.current.hide) clearTimeout(timers.current.hide);
        
        setState(prevState => {
            if (!prevState.isRunning) return prevState;

            let newContent: string;
            let newCircleColor = prevState.circleColor;
            const currentAlphabet = prevState.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
            const currentActions = prevState.useFourArrows ? ACTIONS_4 : ACTIONS;

            switch (prevState.contentMode) {
                case 'digit':
                    newContent = getNextItem(NUMBERS, prevState.letter);
                    break;
                case 'two_digits':
                    const num = Math.floor(Math.random() * 100);
                    newContent = String(num).padStart(2, '0');
                    break;
                case 'circle':
                    newContent = ''; // Content is empty, just circle
                    newCircleColor = getNextItem(prevState.colorPalette, prevState.circleColor);
                    break;
                case 'letter':
                default:
                    newContent = getNextItem(currentAlphabet, prevState.letter);
                    break;
            }
            const newAction = getNextItem(currentActions, prevState.action);
            const newRandomArrowDirection = getNextItem(DIRECTIONS, prevState.randomArrowDirection) as 'up' | 'down' | 'left' | 'right';
            const newArrowSide = Math.random() > 0.5 ? 'left' : 'right';
            
            // Fix: Removed `|| prevState.isRunning` to correctly enforce hide time unless duration > speed
            const isInfinite = prevState.displayDuration >= prevState.baseSpeed;

            if (prevState.isDisplayActive && !isInfinite) {
                timers.current.hide = window.setTimeout(() => setState(s => ({ ...s, isLetterVisible: false })), prevState.displayDuration * 1000);
            }
            timers.current.main = window.setTimeout(tick, prevState.currentDelay);
            return { 
                ...prevState, 
                counter: prevState.counter + 1, 
                letter: newContent, 
                action: newAction, 
                circleColor: newCircleColor, 
                isLetterVisible: true,
                randomArrowDirection: newRandomArrowDirection,
                arrowSide: newArrowSide
            };
        });
    }, [getRandom, getNextItem]);

    const applyAcceleration = useCallback(() => {
        setState(prevState => {
            if (prevState.decrement > 0 && prevState.currentDelay > 100) {
                let newSpeedInSeconds = (prevState.currentDelay / 1000) - prevState.decrement;
                return { ...prevState, currentDelay: Math.max(0.1, newSpeedInSeconds) * 1000 };
            }
            return prevState;
        });
    }, []);

    const toggleRun = useCallback(() => {
        vibrate(50);
        setState(prevState => {
            const newIsRunning = !prevState.isRunning;
            if (newIsRunning) {
                return { ...prevState, isRunning: true, counter: 0, currentDelay: prevState.baseSpeed * 1000 };
            } else {
                clearAllTimers();
                return { ...prevState, isRunning: false, baseSpeed: prevState.currentDelay / 1000, isLetterVisible: true };
            }
        });
    }, [clearAllTimers]);
    
    // Effects
    useEffect(() => { // Main tick runner
        if (state.isRunning) tick();
        return () => clearAllTimers();
    }, [state.isRunning, tick, clearAllTimers]);

     useEffect(() => { // Acceleration runner
        if (state.isRunning) {
            if(timers.current.accel) clearInterval(timers.current.accel);
            if (state.isAccelerationActive && state.decrement > 0 && state.interval > 0) {
                timers.current.accel = window.setInterval(applyAcceleration, state.interval * 1000);
            }
        }
    }, [state.decrement, state.interval, state.isRunning, state.isAccelerationActive, applyAcceleration]);

    useEffect(() => { // Stop games when switching modes
        if (state.isRunning) toggleRun();
        if (state.reactionState.isRunning) toggleReactionRun();
    }, [state.displayMode, toggleRun, toggleReactionRun]);


    useEffect(() => { // Save to localStorage
        const { baseSpeed, decrement, interval, displayDuration, isDisplayActive, fontSizeVh, lineSpacingEm, positionOffset, displayMode, contentMode, colors, isAccelerationActive, reactionState, colorPalette, circleColor, arrowMode, randomArrowDirection, arrowSide, isFocusDotVisible, excludeHardLetters, useFourArrows, repeatChance, customActionsLetters, customActionsArrows, backgroundMode } = state;
        const { gridSize, stimulusMode, isMemoryMode, memorySequenceLength, simpleModeSettings, memoryModeSettings, observationModeSettings, isObservationMode, gridBrightness, gridFontSizes, isGridVisible, isMovingDotActive, dotSpeed } = reactionState;
        const stateToSave = { baseSpeed, decrement, interval, displayDuration, isDisplayActive, fontSizeVh, lineSpacingEm, positionOffset, displayMode, contentMode, colors, isAccelerationActive, reactionState: { gridSize, stimulusMode, isMemoryMode, memorySequenceLength, simpleModeSettings, memoryModeSettings, observationModeSettings, isObservationMode, gridBrightness, gridFontSizes, isGridVisible, isMovingDotActive, dotSpeed }, colorPalette, circleColor, arrowMode, randomArrowDirection, arrowSide, isFocusDotVisible, excludeHardLetters, useFourArrows, repeatChance, customActionsLetters, customActionsArrows, backgroundMode };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
        }
    }, [
        state.baseSpeed, state.decrement, state.interval, state.displayDuration,
        state.isDisplayActive, state.fontSizeVh, state.lineSpacingEm, state.positionOffset,
        state.displayMode, state.contentMode, state.colors, state.isAccelerationActive,
        state.reactionState, state.colorPalette, state.circleColor, state.arrowMode,
        state.randomArrowDirection, state.arrowSide, state.isFocusDotVisible, state.excludeHardLetters, state.useFourArrows,
        state.repeatChance, state.customActionsLetters, state.customActionsArrows, state.backgroundMode
    ]);

    const showToast = useCallback((el: 'fs' | 'ls' | 'reset', text: string) => {
        setToast({ el, text, visible: true });
        if (timers.current.toast) clearTimeout(timers.current.toast);
        timers.current.toast = window.setTimeout(() => setToast(t => ({...t, visible: false})), 2000);
    }, []);

    // --- UPDATED GLOBAL GESTURE HANDLERS (Document Level) ---
    // Moves gesture processing to global events to prevent "slip off" and blocking.
    // Removes `showToast` for instant responsiveness.
    // Uses `isGestureActive` state for correct UI syncing.

    const handleGlobalGestureMove = useCallback((e: TouchEvent) => {
        // If moved, clear long press timer immediately
        if (globalLongPressTimer.current) {
            clearTimeout(globalLongPressTimer.current);
            globalLongPressTimer.current = null;
        }
        
        if (!gestureState.current.active || gestureState.current.mode === 'reaction') return;
        e.preventDefault(); // Prevent scrolling

        const dx = e.touches[0].clientX - gestureState.current.startX;
        const dy = e.touches[0].clientY - gestureState.current.startY;

        if (!gestureState.current.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            gestureState.current.hasMoved = true;
            gestureState.current.lock = Math.abs(dy) > Math.abs(dx) ? 'vert' : 'horz';
            
            // Always enable gesture active state when moving to prevent flickering/update overlays
            setIsGestureActive(true);
        }

        const mode = gestureState.current.mode;

        if (gestureState.current.lock === 'vert') {
            // Vertical: Font Size - "Rigidly Tied"
            // Logic: StartValue + (Delta / Sensitivity).
            // Sensitivity 7.5 means moving 75px changes size by 10vh.
            const newFontSize = Math.max(5, Math.min(60, gestureState.current.startF + (dy / 7.5)));
            setState(s => ({ ...s, fontSizeVh: newFontSize }));
            // REMOVED showToast for performance/responsiveness
        } else if (gestureState.current.lock === 'horz') {
            // Horizontal
            if (mode === 'default') {
                const newLineSpacing = Math.max(-0.2, Math.min(2.0, gestureState.current.startL + (dx / 150)));
                setState(s => ({ ...s, lineSpacingEm: newLineSpacing }));
            } else if (mode === 'position') {
                const newPositionOffset = Math.max(10, Math.min(45, gestureState.current.startPO + (dx / 10)));
                setState(s => ({ ...s, positionOffset: newPositionOffset }));
            }
        }
    }, []);

    const handleGlobalGestureEnd = useCallback(() => {
        // Clean up global listeners immediately
        document.removeEventListener('touchmove', handleGlobalGestureMove);
        document.removeEventListener('touchend', handleGlobalGestureEnd);

        // Clear long press timer
        if (globalLongPressTimer.current) {
            clearTimeout(globalLongPressTimer.current);
            globalLongPressTimer.current = null;
        }

        if (!gestureState.current.active) return;
        
        const wasMoved = gestureState.current.hasMoved;
        const wasLongPress = globalLongPressFired.current;
        
        gestureState.current.active = false;
        globalLongPressFired.current = false;
        setIsGestureActive(false); // Always ensure we hide overlay on end

        if (wasMoved || wasLongPress) return;

        // Tap Logic (only if not moved and not long pressed)
        const currentTime = new Date().getTime();
        if (currentTime - tapState.current.lastTap < 300) {
            // Double Tap: Reset
            if (tapState.current.timer) clearTimeout(tapState.current.timer);
            tapState.current.lastTap = 0;
            vibrate(20);
            setState(s => ({...s, fontSizeVh: 25, lineSpacingEm: 0, positionOffset: 25 }));
            showToast('reset', `Настройки сброшены`);
        } else {
            // Single Tap: Toggle Pause
            tapState.current.timer = window.setTimeout(() => toggleRun(), 280);
        }
        tapState.current.lastTap = currentTime;
    }, [handleGlobalGestureMove, showToast, toggleRun]);

    const handleGestureStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (state.displayMode === 'reaction') return;
        
        // Initialize gesture state
        gestureState.current = { 
            active: true, 
            hasMoved: false, 
            startX: e.touches[0].clientX, 
            startY: e.touches[0].clientY, 
            startF: state.fontSizeVh, 
            startL: state.lineSpacingEm, 
            startPO: state.positionOffset, 
            lock: null,
            mode: state.displayMode 
        };
        globalLongPressFired.current = false;
        
        // Long Press Logic for Focus Dot (Global for non-reaction modes)
        if (globalLongPressTimer.current) clearTimeout(globalLongPressTimer.current);
        globalLongPressTimer.current = window.setTimeout(() => {
             vibrate(20);
             setState(s => ({ ...s, isFocusDotVisible: !s.isFocusDotVisible }));
             globalLongPressFired.current = true;
        }, 600);

        // Attach global listeners to document to handle drags outside the element
        document.addEventListener('touchmove', handleGlobalGestureMove, { passive: false });
        document.addEventListener('touchend', handleGlobalGestureEnd);
    }, [state.displayMode, state.fontSizeVh, state.lineSpacingEm, state.positionOffset, handleGlobalGestureMove, handleGlobalGestureEnd]);

    // Ensure listeners are removed if component unmounts mid-gesture
    useEffect(() => {
        return () => {
            document.removeEventListener('touchmove', handleGlobalGestureMove);
            document.removeEventListener('touchend', handleGlobalGestureEnd);
        };
    }, [handleGlobalGestureMove, handleGlobalGestureEnd]);
    
    // --- END GLOBAL GESTURE HANDLERS ---

    
    // Brightness Gesture Handlers for Reaction Grid
    const handleReactionGestureStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (state.reactionState.isRunning && !state.reactionState.isObservationMode) return;
        e.preventDefault();
        
        const currentAlphabet = state.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
        previewChars.current = Array.from({ length: state.reactionState.gridSize }, () =>
            getRandom([...currentAlphabet, ...NUMBERS])
        );

        reactionGestureState.current = {
            active: true,
            hasMoved: false,
            startY: e.touches[0].clientY,
            startX: e.touches[0].clientX,
            startBrightness: state.reactionState.gridBrightness,
            startFontSize: state.reactionState.gridFontSizes[state.reactionState.gridSize] || DEFAULT_GRID_FONT_SIZES[state.reactionState.gridSize],
            lock: null,
        };

        // Long press to toggle Global Focus Dot (Moved from Grid to Dot)
        if (!state.reactionState.isRunning) {
            longPressActionFired.current = false;
            longPressTimer.current = window.setTimeout(() => {
                vibrate(40);
                // Toggle Global Dot
                setState(s => ({...s, isFocusDotVisible: !s.isFocusDotVisible }));
                longPressActionFired.current = true;
            }, 600);
        }
        
        setIsAdjustingGridFontSize(false);
    };

    const handleReactionGestureMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!reactionGestureState.current.active) return;
        e.preventDefault();

        const dx = e.touches[0].clientX - reactionGestureState.current.startX;
        const dy = e.touches[0].clientY - reactionGestureState.current.startY;
        
        if (!reactionGestureState.current.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            reactionGestureState.current.hasMoved = true;
            if (longPressTimer.current) clearTimeout(longPressTimer.current); // Cancel long press on move
            reactionGestureState.current.lock = Math.abs(dy) > Math.abs(dx) ? 'vert' : 'horz';
        }

        if (reactionGestureState.current.lock === 'horz') {
            const deltaRatio = dx / window.innerWidth;
            let newBrightness = reactionGestureState.current.startBrightness + deltaRatio * 1.5;
            newBrightness = Math.max(0.1, Math.min(2.0, newBrightness));
            setState(s => ({...s, reactionState: {...s.reactionState, gridBrightness: newBrightness}}));
        } else if (reactionGestureState.current.lock === 'vert') {
            if (!isAdjustingGridFontSize) setIsAdjustingGridFontSize(true);
            const newFontSize = Math.max(2, Math.min(30, reactionGestureState.current.startFontSize - (dy / 7.5)));
            setState(s => {
                const newFontSizes = { ...s.reactionState.gridFontSizes, [s.reactionState.gridSize]: newFontSize };
                return { ...s, reactionState: {...s.reactionState, gridFontSizes: newFontSizes } };
            });
        }
    };

    const handleReactionGestureEnd = () => {
        if (!reactionGestureState.current.active) return;

        // Stop the long press timer if it's still running
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        
        setIsAdjustingGridFontSize(false);
        
        const wasMoved = reactionGestureState.current.hasMoved;
        const longPressFired = longPressActionFired.current;

        // Reset gesture and long press states
        reactionGestureState.current.active = false;
        longPressActionFired.current = false;

        // If it was a drag or a successful long press, we're done.
        if (wasMoved || longPressFired) {
            return;
        }

        // --- If we get here, it was a short tap ---
        
        const isGameRunning = state.reactionState.isRunning;

        // Stop observation mode if running
        if (isGameRunning && state.reactionState.isObservationMode) {
            if (tapState.current.timer) clearTimeout(tapState.current.timer);
            toggleReactionRun();
            return;
        }
        
        // Don't handle taps if game is running (except for observation mode above)
        if (isGameRunning) return;

        // Handle single/double taps for other cases (game stopped)
        const currentTime = new Date().getTime();
        if (currentTime - tapState.current.lastTap < 300) { // Double tap
            if (tapState.current.timer) clearTimeout(tapState.current.timer);
            tapState.current.lastTap = 0;
            vibrate(30);
            setState(s => ({...s, reactionState: {
                ...s.reactionState, 
                isMovingDotActive: !s.reactionState.isMovingDotActive,
            }}));
        } else { // Single tap
            tapState.current.timer = window.setTimeout(() => {
                vibrate(20);
                // Toggle Grid Visibility (Moved from Long Press to Short Tap)
                setState(s => ({...s, reactionState: {...s.reactionState, isGridVisible: !s.reactionState.isGridVisible}}));
            }, 280);
        }
        tapState.current.lastTap = currentTime;
    };


    // Control Handlers
    const handleSliderChange = (type: SliderType, value: number) => {
        setState(prevState => {
            if (type.startsWith('r_')) {
                // Handle general reaction slider updates
                if (type === 'r_speed') {
                    return {
                        ...prevState,
                        reactionState: {
                            ...prevState.reactionState,
                            dotSpeed: value
                        }
                    };
                }

                const currentSettings = prevState.reactionState[settingsKey];
                let newSettings = { ...currentSettings };

                switch (type) {
                    case 'r_min':
                        newSettings.minDelay = value;
                        newSettings.maxDelay = Math.max(value, currentSettings.maxDelay);
                        if (!currentSettings.isShowTimeLinkedToDelay) {
                           newSettings.showTime = Math.min(currentSettings.showTime, value);
                        }
                        break;
                    case 'r_max':
                        newSettings.maxDelay = value;
                        newSettings.minDelay = Math.min(value, currentSettings.minDelay);
                        break;
                    case 'r_show':
                        newSettings.showTime = Math.min(value, currentSettings.minDelay);
                        break;
                }
                return { ...prevState, reactionState: { ...prevState.reactionState, [settingsKey]: newSettings } };
            }
            
            switch (type) {
                case 'speed': 
                    return { ...prevState, baseSpeed: value, currentDelay: value * 1000, displayDuration: Math.min(prevState.displayDuration, value) };
                case 'dec': 
                    return { ...prevState, decrement: value };
                case 'int': 
                    return { ...prevState, interval: value };
                case 'dur':
                     const newDur = Math.min(value, prevState.baseSpeed);
                    return { ...prevState, displayDuration: newDur };
                default: return prevState;
            }
        });
    };
    
    // Handler for Repeat Chance Slider
    const handleRepeatChanceChange = (value: number) => {
        setState(s => ({ ...s, repeatChance: value }));
    };

    const handleAccelerationToggle = useCallback(() => {
        if (state.decrement <= 0) return;
        vibrate(20);
        setState(s => ({...s, isAccelerationActive: !s.isAccelerationActive, baseSpeed: s.isAccelerationActive ? s.currentDelay / 1000 : s.baseSpeed }));
    }, [state.decrement, state.currentDelay, state.baseSpeed]);
    
    const handleDisplayToggle = useCallback(() => {
        vibrate(20);
        setState(s => ({...s, isDisplayActive: !s.isDisplayActive, isLetterVisible: s.isDisplayActive ? s.isLetterVisible : true }));
    }, []);

    const handleDotToggle = useCallback(() => {
        vibrate(20);
        setState(s => ({
            ...s,
            reactionState: {
                ...s.reactionState,
                isMovingDotActive: !s.reactionState.isMovingDotActive
            }
        }));
    }, []);
    
    const handleArrowsToggle = useCallback(() => {
        vibrate(20);
        setState(s => {
            let nextMode: ArrowMode = 'off';
            
            if (s.displayMode === 'position') {
                // Toggle between off and random arrow mode for Position Display
                if (s.arrowMode === 'off') nextMode = 'random';
                else nextMode = 'off';
            } else if (s.contentMode === 'circle') {
                // Cycle: off (Letters) -> below (Arrow Below) -> inside (Arrow Inside) -> off
                if (s.arrowMode === 'off') nextMode = 'below';
                else if (s.arrowMode === 'below') nextMode = 'inside';
                else nextMode = 'off';
            } else {
                // Cycle: off -> below -> off (Inside not suitable for text)
                if (s.arrowMode === 'off') nextMode = 'below';
                else nextMode = 'off';
            }
            return { ...s, arrowMode: nextMode };
        });
    }, []);

    const toggleHardLetters = useCallback(() => {
        vibrate(50);
        setState(s => {
            const newState = !s.excludeHardLetters;
            showToast('reset', newState ? 'Без Ъ и Ь' : 'Все буквы');
            return { ...s, excludeHardLetters: newState };
        });
    }, [showToast]);

    const toggleFourArrows = useCallback(() => {
        vibrate(50);
        setState(s => {
            const newState = !s.useFourArrows;
            showToast('reset', newState ? '4 Стрелки' : '3 Стрелки');
            return { ...s, useFourArrows: newState };
        });
    }, [showToast]);
    
    // --- Long Press Button Logic ---
    const handlePressStart = (longPressCallback: () => void, e?: React.TouchEvent) => {
        if(e) e.stopPropagation();
        longPressActionFired.current = false;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
            vibrate(40);
            longPressCallback();
            longPressActionFired.current = true;
        }, 600);
    };

    const handlePressEnd = (shortPressCallback: () => void, e?: React.TouchEvent) => {
        if(e) e.stopPropagation();
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (!longPressActionFired.current) {
            vibrate(20);
            shortPressCallback();
        }
    };
    
    // Special Handler for Start Button Long Press (Color Editor Toggle)
    const handleStartButtonLongPress = useCallback(() => {
        vibrate(60);
        // Toggle editor
        setState(s => {
            const isOpening = !s.isColorEditorVisible;
            if (isOpening) {
                // Reset to first color (Red) when opening
                setActiveEditorColorIndex(0);
            }
            return {
                ...s,
                isColorEditorVisible: isOpening,
                isRunning: false, // Stop game if running
                reactionState: { ...s.reactionState, isRunning: false } // Stop reaction game if running
            };
        });
    }, []);
    
    const handleStartButtonPressStart = (e: React.TouchEvent) => {
         e.stopPropagation();
         longPressActionFired.current = false;
         if (longPressTimer.current) clearTimeout(longPressTimer.current);
         longPressTimer.current = window.setTimeout(() => {
            longPressActionFired.current = true;
            handleStartButtonLongPress();
         }, 800);
    };
    
    const handleStartButtonPressEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (!longPressActionFired.current) {
            // Short press behavior
            if (state.isColorEditorVisible) {
                 // Short press in editor -> Exit
                 vibrate(20);
                 setState(s => ({ ...s, isColorEditorVisible: false }));
            } else {
                // Short press in game -> Toggle Run
                vibrate(20);
                if (state.displayMode === 'reaction') {
                    toggleReactionRun();
                } else {
                    toggleRun();
                }
            }
        }
    };


    const changeDisplayMode = useCallback((forward: boolean) => {
        setState(s => {
            const modes: AppState['displayMode'][] = ['default', 'color', 'position', 'reaction'];
            const currentIndex = modes.indexOf(s.displayMode);
            const nextIndex = forward
                ? (currentIndex + 1) % modes.length
                : (currentIndex - 1 + modes.length) % modes.length;
            
            const nextDisplayMode = modes[nextIndex];
            let nextContentMode = s.contentMode;

            // Fix: If entering Color mode and content is Circle, switch to Letter
            // Because "Circle" content mode is disabled in "Color" display mode
            if (nextDisplayMode === 'color' && nextContentMode === 'circle') {
                nextContentMode = 'letter';
            }
            
            // Immediate preview update
            let updates = {};
            if (!s.isRunning) {
                 const currentActions = s.useFourArrows ? ACTIONS_4 : ACTIONS;
                 const newAction = getRandom(currentActions);
                 let newLetter = s.letter;
                 let newColor = s.circleColor;
                 const currentAlphabet = s.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
                 
                 switch(nextContentMode) {
                     case 'digit': newLetter = getRandom(NUMBERS); break;
                     case 'two_digits': 
                         newLetter = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                         break;
                     case 'circle':
                         newLetter = '';
                         newColor = getRandom(s.colorPalette);
                         break;
                     default: newLetter = getRandom(currentAlphabet); break;
                 }
                 updates = { letter: newLetter, action: newAction, circleColor: newColor, isLetterVisible: true };
            }
            
            // Ensure arrowMode is compatible when switching modes
            // If switching to position mode, arrowMode should be off or random (persisted or reset? keeping state is better)
            // If switching to Default mode, it maintains its state.
            // We let the states persist independently in logic but share storage variable.

            return { 
                ...s, 
                displayMode: nextDisplayMode, 
                contentMode: nextContentMode, 
                isColorModeSettingsActive: false,
                ...updates
            }; 
        });
    }, [getRandom]);
    const handleNextDisplayMode = () => changeDisplayMode(true);
    const handlePrevDisplayMode = () => changeDisplayMode(false);

    const changeStimulusMode = useCallback(() => {
        setState(s => {
            const currentIndex = STIMULUS_MODES.indexOf(s.reactionState.stimulusMode);
             const nextIndex = (currentIndex + 1) % STIMULUS_MODES.length;
            return { ...s, reactionState: { ...s.reactionState, stimulusMode: STIMULUS_MODES[nextIndex] } };
        });
    }, []);
    const handleNextStimulusMode = () => changeStimulusMode();
    
    const toggleObservationMode = useCallback(() => {
        setState(s => {
            const newIsObservationMode = !s.reactionState.isObservationMode;
            return {
                ...s,
                reactionState: {
                    ...s.reactionState,
                    isObservationMode: newIsObservationMode,
                    // if observation mode is being turned ON, turn memory mode OFF
                    isMemoryMode: newIsObservationMode ? false : s.reactionState.isMemoryMode,
                }
            };
        });
    }, []);

    const handleToggleMemoryMode = useCallback(() => {
        setState(s => {
            const newIsMemoryMode = !s.reactionState.isMemoryMode;
            return {
                ...s,
                reactionState: {
                    ...s.reactionState,
                    isMemoryMode: newIsMemoryMode,
                    // if memory mode is being turned ON, turn observation mode OFF
                    isObservationMode: newIsMemoryMode ? false : s.reactionState.isObservationMode,
                }
            };
        });
    }, []);

    const handleChangeMemoryLength = useCallback(() => {
        if (!state.reactionState.isMemoryMode) return;
        setState(s => {
            const currentIndex = MEMORY_SEQUENCE_LENGTHS.indexOf(s.reactionState.memorySequenceLength);
            const nextIndex = (currentIndex + 1) % MEMORY_SEQUENCE_LENGTHS.length;
            return { ...s, reactionState: { ...s.reactionState, memorySequenceLength: MEMORY_SEQUENCE_LENGTHS[nextIndex] } };
        });
    }, [state.reactionState.isMemoryMode]);

    // --- End Long Press Logic ---

    const handleContentModeChange = (forward: boolean = true) => {
        vibrate(20);
        setState(s => {
            // Determine available modes based on displayMode
            let modes: AppState['contentMode'][];
            if (s.displayMode === 'color') {
                 // In Color Display Mode, 'circle' is not available
                 modes = ['letter', 'digit', 'two_digits'];
            } else {
                 // In Default/Position, 'circle' is available
                 modes = ['letter', 'digit', 'two_digits', 'circle'];
            }
            
            // Ensure current mode is valid
            const currentMode = modes.includes(s.contentMode) ? s.contentMode : modes[0];
            const currentIndex = modes.indexOf(currentMode);
            
            const nextIndex = forward 
                ? (currentIndex + 1) % modes.length
                : (currentIndex - 1 + modes.length) % modes.length;
            
            const nextMode = modes[nextIndex];

            // Immediate preview refresh if not running
            let updates = {};
            if (!s.isRunning) {
                 const currentActions = s.useFourArrows ? ACTIONS_4 : ACTIONS;
                 const newAction = getRandom(currentActions);
                 let newLetter = s.letter;
                 let newColor = s.circleColor;
                 const currentAlphabet = s.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
                 
                 switch(nextMode) {
                     case 'digit': newLetter = getRandom(NUMBERS); break;
                     case 'two_digits': 
                         newLetter = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                         break;
                     case 'circle':
                         newLetter = '';
                         newColor = getRandom(s.colorPalette);
                         break;
                     default: newLetter = getRandom(currentAlphabet); break;
                 }
                 updates = { letter: newLetter, action: newAction, circleColor: newColor, isLetterVisible: true };
            }

            // Fix: Force 'inside' arrow mode to 'below' when leaving circle mode
            // This ensures the "circle around arrow" disappears when changing from Color(Circle) content to Text
            let nextArrowMode = s.arrowMode;
            if (s.contentMode === 'circle' && nextMode !== 'circle' && s.arrowMode === 'inside') {
                nextArrowMode = 'below';
            }
                
            return { ...s, contentMode: nextMode, arrowMode: nextArrowMode, ...updates };
        });
    };

    const handleChangeColor = (action: string, direction: number = 1) => {
        vibrate(20);
        setState(s => {
            const currentColor = s.colors[action];
            const currentIndex = s.colorPalette.indexOf(currentColor);
            const nextIndex = (currentIndex + direction + s.colorPalette.length) % s.colorPalette.length;

            // Also generate new random content if manually triggered (part of the "interface response" request)
            // We only do this visual update in the setState to avoid double renders.
            let newLetter = s.letter;
             if (!s.isRunning) {
                 const currentAlphabet = s.excludeHardLetters ? RUSSIAN_ALPHABET_NO_HARD : RUSSIAN_ALPHABET;
                 switch(s.contentMode) {
                     case 'digit': newLetter = getRandom(NUMBERS); break;
                     case 'two_digits': 
                         newLetter = String(Math.floor(Math.random() * 100)).padStart(2, '0');
                         break;
                     case 'circle':
                         // Circle content mode is not active in color mode, so skip
                         break;
                     default: newLetter = getRandom(currentAlphabet); break;
                 }
             }

            return { 
                ...s, 
                colors: { ...s.colors, [action]: s.colorPalette[nextIndex] },
                // Force update content and action to match the button pressed
                action: action,
                letter: !s.isRunning ? newLetter : s.letter,
                isLetterVisible: true
            };
        });
    };
    
    const handleGridSizeChange = useCallback((forward: boolean) => {
        setState(s => {
            const sizes: (typeof s.reactionState.gridSize)[] = [4, 6, 9, 12, 20, 24, 30, 35, 48, 54, 70, 77, 108, 117, 140, 150];
            const currentIndex = sizes.indexOf(s.reactionState.gridSize);
            const nextIndex = forward
                ? (currentIndex + 1) % sizes.length
                : (currentIndex - 1 + sizes.length) % sizes.length;
            const newSize = sizes[nextIndex];
            return {
                ...s,
                reactionState: {
                    ...s.reactionState,
                    gridSize: newSize,
                }
            };
        });
    }, []);
    const handleNextGridSize = () => handleGridSizeChange(true);
    const handlePrevGridSize = () => handleGridSizeChange(false);


    const handleReactionDelayModeToggle = useCallback(() => {
        vibrate(20);
        setState(s => ({
            ...s,
            reactionState: {
                ...s.reactionState,
                [settingsKey]: {
                    ...s.reactionState[settingsKey],
                    isFixedDelay: !s.reactionState[settingsKey].isFixedDelay,
                }
            }
        }));
    }, [settingsKey]);

    const handleShowTimeLinkToggle = useCallback(() => {
        vibrate(20);
        setState(s => ({
            ...s,
            reactionState: {
                ...s.reactionState,
                [settingsKey]: {
                    ...s.reactionState[settingsKey],
                    isShowTimeLinkedToDelay: !s.reactionState[settingsKey].isShowTimeLinkedToDelay,
                }
            }
        }));
    }, [settingsKey]);
    
    // --- New Color Editor Logic ---
    
    const handleEditorScreenTouchStart = () => {
        editorBgPressedRef.current = true;
        
        // Long Press to Reset All
        editorLongPressTimer.current = window.setTimeout(() => {
            vibrate(100);
            setState(s => {
                const newColors = { ...s.colors };
                // Reset game colors to new defaults
                for (const key in newColors) {
                    const idx = s.colorPalette.indexOf(newColors[key]);
                    if (idx !== -1) newColors[key] = DEFAULT_COLOR_PALETTE[idx];
                }
                return { ...s, colorPalette: [...DEFAULT_COLOR_PALETTE], colors: newColors };
            });
            showToast('reset', 'Палитра сброшена');
            editorLongPressTimer.current = null;
        }, 1200);
    };
    
    const handleEditorScreenTouchEnd = () => {
        // Only process if touch started on bg
        if (!editorBgPressedRef.current) return;
        editorBgPressedRef.current = false;

        if (editorLongPressTimer.current) {
            clearTimeout(editorLongPressTimer.current);
            editorLongPressTimer.current = null;
        }
        
        // Handle taps (if not dragged and not long pressed)
        // Since we are on the background, we assume no complex drag gestures on bg itself
        // But we need to debounce double taps
        
        const currentTime = Date.now();
        if (currentTime - editorTapState.current.lastTap < 300) {
            // Double Tap: Reset current color
            if (editorTapState.current.timer) clearTimeout(editorTapState.current.timer);
            editorTapState.current.lastTap = 0;
            vibrate(50);
            
            setState(s => {
                const newPalette = [...s.colorPalette];
                newPalette[activeEditorColorIndex] = DEFAULT_COLOR_PALETTE[activeEditorColorIndex];
                
                const newColors = { ...s.colors };
                for (const key in newColors) {
                    const idx = s.colorPalette.indexOf(newColors[key]);
                    if (idx !== -1) newColors[key] = newPalette[idx];
                }
                return { ...s, colorPalette: newPalette, colors: newColors };
             });
            
        } else {
            // Single Tap: Next Color
             editorTapState.current.timer = window.setTimeout(() => {
                vibrate(20);
                setActiveEditorColorIndex(prev => (prev + 1) % 7);
            }, 300);
        }
        editorTapState.current.lastTap = currentTime;
    };
    
    const handlePrevEditorColor = () => {
         vibrate(20);
         setActiveEditorColorIndex(prev => (prev - 1 + 7) % 7);
    };


    const handleRGBChange = (channel: 'r' | 'g' | 'b', value: number) => {
        const currentHex = state.colorPalette[activeEditorColorIndex];
        const rgb = hexToRgb(currentHex);
        const newRgb = { ...rgb, [channel]: value };
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);

        setState(s => {
            const newPalette = [...s.colorPalette];
            newPalette[activeEditorColorIndex] = newHex;
            const newColors = { ...s.colors };
            for (const key in newColors) {
                const idx = s.colorPalette.indexOf(newColors[key]);
                if (idx !== -1) newColors[key] = newPalette[idx];
            }
            return { ...s, colorPalette: newPalette, colors: newColors };
        });
    };
    
    // Updates custom symbols (arrows)
    const handleCustomActionChange = (actionKey: string, value: string, type: 'letter' | 'arrow') => {
        setState(s => ({
            ...s,
            customActionsLetters: type === 'letter' ? { ...s.customActionsLetters, [actionKey]: value.slice(0, 1) } : s.customActionsLetters,
            customActionsArrows: type === 'arrow' ? { ...s.customActionsArrows, [actionKey]: value.slice(0, 1) } : s.customActionsArrows,
        }));
    };
    
    // Update background mode directly from button click
    const setBackgroundMode = (mode: 'black' | 'dark' | 'gray') => {
         setState(s => ({ ...s, backgroundMode: mode }));
    };

    // --- End Color Editor Logic ---
    
    // --- Footer Transparency Logic ---
    const handleControlsAreaTap = (e: React.MouseEvent | React.TouchEvent) => {
        // Only cycle if the user tapped the sensitive area
        // Cycle: 0 (Full) -> 1 (Transparent BG) -> 2 (Hidden) -> 0 (Full)
        setControlsVisibilityMode(prev => (prev + 1) % 3 as 0 | 1 | 2);
    };


    const getGridClasses = (size: number) => {
        switch (size) {
            case 150: return 'grid-cols-10 grid-rows-15';
            case 140: return 'grid-cols-10 grid-rows-14';
            case 117: return 'grid-cols-9 grid-rows-13';
            case 108: return 'grid-cols-9 grid-rows-12';
            case 77: return 'grid-cols-7 grid-rows-11';
            case 70: return 'grid-cols-7 grid-rows-10';
            case 54: return 'grid-cols-6 grid-rows-9';
            case 48: return 'grid-cols-6 grid-rows-8';
            case 35: return 'grid-cols-5 grid-rows-7';
            case 30: return 'grid-cols-5 grid-rows-6';
            case 24: return 'grid-cols-4 grid-rows-6';
            case 20: return 'grid-cols-4 grid-rows-5';
            case 12: return 'grid-cols-3 grid-rows-4';
            case 9: return 'grid-cols-3 grid-rows-3';
            case 6: return 'grid-cols-2 grid-rows-3';
            case 4:
            default: return 'grid-cols-2 grid-rows-2';
        }
    };
    
    const reactionTextStyle: React.CSSProperties = {
        fontFamily: "'Rubik', sans-serif",
        fontSize: `${state.reactionState.gridFontSizes[state.reactionState.gridSize] || DEFAULT_GRID_FONT_SIZES[state.reactionState.gridSize]}vh`,
        lineHeight: 1,
    };

    const letterStyle: React.CSSProperties = { 
        fontFamily: "'Rubik', sans-serif",
        fontSize: `${state.fontSizeVh}vh`, 
        lineHeight: 0.9 
    };
    const actionStyle: React.CSSProperties = { ...letterStyle, marginTop: `${state.lineSpacingEm}em` };
    
    const displayModeLabels = { 'default': 'Обычный', 'color': 'Цвет', 'position': 'Позиция', 'reaction': 'Реакция' };
    const contentModeLabels = { 'letter': 'Буква', 'digit': 'Цифра', 'two_digits': 'Две', 'circle': 'Цвет' };
    
    const commonButtonClasses = "h-8 flex items-center justify-center text-sm font-semibold rounded-lg bg-neutral-700 text-neutral-100 transition-colors active:bg-neutral-600 focus:outline-none text-center capitalize select-none px-1 truncate";

    // Base RGB for neutral-800 (#262626) is (38, 38, 38)
    const gridLineBrightness = Math.round(38 * state.reactionState.gridBrightness);
    const gridLineColor = `rgb(${gridLineBrightness}, ${gridLineBrightness}, ${gridLineBrightness})`;
    const isGridMode = state.displayMode === 'reaction';

    // Determine if game or reaction is running for the Start Button State
    const isAnyRunning = state.isRunning || state.reactionState.isRunning;

    const currentRGB = hexToRgb(state.colorPalette[activeEditorColorIndex]);
    
    const getContrastColor = (hex: string) => {
        const { r, g, b } = hexToRgb(hex);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
    };
    
    const ArrowIcon = ({ type, className }: { type: string, className: string }) => {
        if (type === 'Л') return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={className}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
        );
        if (type === 'П') return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={className}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
        );
        if (type === 'О') return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={className}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
        );
        if (type === 'В') return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={className}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
            </svg>
        );
        return null;
    };

    const DirectionArrow = ({ direction }: { direction: string }) => {
        const rotation = {
            'up': 'rotate-0',
            'down': 'rotate-180',
            'left': '-rotate-90',
            'right': 'rotate-90'
        }[direction] || 'rotate-0';

        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" 
                className={`transition-transform duration-0 ${rotation}`}
                style={{ width: `${state.fontSizeVh}vh`, height: `${state.fontSizeVh}vh` }}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5L12 4.5 4.5 12" />
            </svg>
        );
    };

    const renderActionContent = () => {
        // Mode Check: Are arrows OFF? If so, we are in "Letter Mode"
        const isLetterMode = state.arrowMode === 'off';
        
        if (isLetterMode) {
            // Check Custom Letters (Replacements for Л, П, О, В)
            const customLetter = state.customActionsLetters[state.action];
            if (customLetter && customLetter.trim() !== '') {
                return customLetter;
            }
            return state.action; // Return default 'Л', 'П' etc.
        } else {
            // We are in Arrow Mode (Inside, Below, Random)
            // Check Custom Arrow Symbols
            const customArrow = state.customActionsArrows[state.action];
            if (customArrow && customArrow.trim() !== '') {
                return customArrow;
            }
            // Return Default SVG Arrow
            return <ArrowIcon type={state.action} className="w-[0.8em] h-[0.8em]" />;
        }
    };
    
    // Background Class determination
    const getBgClass = () => {
        switch(state.backgroundMode) {
            case 'black': return 'bg-black';
            case 'gray': return 'bg-neutral-800';
            case 'dark': default: return 'bg-neutral-900';
        }
    };

    return (
        <div className={`font-sans text-neutral-200 flex flex-col h-[100dvh] p-3 overflow-hidden touch-none antialiased select-none transition-colors duration-300 ${getBgClass()}`}>
             {/* --- HEADER INFO --- */}
             <div className="absolute top-[15px] left-0 w-full flex justify-between items-start px-5 pointer-events-none z-10">
                {state.isColorEditorVisible ? (
                     <div className="w-full text-center text-white/20 font-bold text-xs uppercase tracking-[0.3em] mt-2 opacity-100 z-50">Настройки</div>
                ) : (
                    <>
                        <div className="text-4xl font-bold text-neutral-500">{state.displayMode === 'reaction' ? state.reactionState.roundCount : state.counter}</div>
                         <div className="flex flex-col items-end text-neutral-500">
                            {state.displayMode === 'reaction' && !state.reactionState.isMemoryMode ? (
                                 <div className={`${state.reactionState.roundCount > 0 || !state.reactionState.isRunning ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="text-4xl font-bold text-right">
                                        {state.reactionState.avgReactionTime.toFixed(3)}<span className="align-baseline text-3xl font-medium">s</span>
                                    </div>
                                    {state.reactionState.roundCount > 0 && (
                                        <div className="text-base font-medium text-right mt-1 text-neutral-600">
                                            <div>Лучшее: {state.reactionState.bestReactionTime.toFixed(3)}s</div>
                                            <div>Среднее (20): {state.reactionState.avgReactionTimeLast20.toFixed(3)}s</div>
                                        </div>
                                    )}
                                 </div>
                            ) : !isGridMode ? (
                                 <div className={`text-4xl font-bold ${state.isRunning ? 'opacity-100' : 'opacity-0'}`}>
                                    {(state.currentDelay / 1000).toFixed(2)}<span className="align-baseline text-3xl font-medium">s</span>
                                </div>
                            ) : null}
                            <div className="text-xl font-medium text-neutral-500 min-h-[2.8em] mt-1 text-right">
                                <div className={`transition-opacity duration-300 ${toast.visible && (toast.el === 'fs' || toast.el === 'reset') ? 'opacity-100' : 'opacity-0'}`}>{toast.text}</div>
                                <div className={`transition-opacity duration-300 ${toast.visible && toast.el === 'ls' ? 'opacity-100' : 'opacity-0'}`}>{toast.text}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

             {/* --- MAIN CONTENT AREA --- */}
            <div
                className="flex-grow flex justify-center items-center w-full relative"
                onTouchStart={state.isColorEditorVisible ? undefined : handleGestureStart}
            >
                 {/* Center Dot - Global Override */}
                {state.isFocusDotVisible && !state.isColorEditorVisible && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-green-600/80 rounded-full pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10"></div>
                )}

                {state.isColorEditorVisible ? (
                    // --- SPLIT SETTINGS SCREEN (Fixed Height) ---
                    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-900">
                        
                        {/* TOP HALF: COLOR PREVIEW + RGB CONTROLS */}
                        <div className="h-1/2 flex flex-col relative border-b border-neutral-800">
                            {/* Color Preview & Touch Area */}
                            <div 
                                className="flex-1 w-full relative"
                                style={{ backgroundColor: state.colorPalette[activeEditorColorIndex] }}
                                onTouchStart={handleEditorScreenTouchStart}
                                onTouchEnd={handleEditorScreenTouchEnd}
                            ></div>

                            {/* RGB Controls Overlay (Bottom of top half) - Flat solid background as requested */}
                             <div className="absolute bottom-0 w-full bg-neutral-900 pb-4 pt-2 px-6">
                                 {/* Header Row */}
                                 <div className="relative flex items-center justify-center min-h-[2rem] mb-2">
                                     <div 
                                        className={`font-bold text-lg tracking-widest uppercase ${activeSlider ? 'opacity-0' : 'opacity-100'}`} 
                                        style={{ color: state.colorPalette[activeEditorColorIndex] }}
                                        onTouchEnd={(e) => { e.stopPropagation(); handlePrevEditorColor(); }}
                                     >
                                        {COLOR_NAMES[activeEditorColorIndex]}
                                     </div>
                                     
                                     {/* Close/Apply Button - Moved to Bottom Right of Top Section */}
                                     <div 
                                        className="absolute right-0 bottom-0 w-12 h-12 flex items-center justify-center cursor-pointer z-50 text-white/80 active:text-white transition-colors"
                                        onTouchStart={(e) => { e.stopPropagation(); vibrate(20); }}
                                        onTouchEnd={(e) => { e.stopPropagation(); setState(s => ({...s, isColorEditorVisible: false})); }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                 </div>

                                 {/* RGB Sliders - Rounded corners reverted, Height 14 kept */}
                                 <div className="w-full max-w-md mx-auto flex flex-col gap-2">
                                     <div className={`transition-opacity duration-150 ${activeSlider && activeSlider !== 'r' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                        <RGBSlider type="r" value={currentRGB.r} onChange={(v) => handleRGBChange('r', v as number)} onActive={(isActive) => setActiveSlider(isActive ? 'r' : null)} className="h-14" />
                                     </div>
                                     <div className={`transition-opacity duration-150 ${activeSlider && activeSlider !== 'g' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                        <RGBSlider type="g" value={currentRGB.g} onChange={(v) => handleRGBChange('g', v as number)} onActive={(isActive) => setActiveSlider(isActive ? 'g' : null)} className="h-14" />
                                     </div>
                                     <div className={`transition-opacity duration-150 ${activeSlider && activeSlider !== 'b' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                        <RGBSlider type="b" value={currentRGB.b} onChange={(v) => handleRGBChange('b', v as number)} onActive={(isActive) => setActiveSlider(isActive ? 'b' : null)} className="h-14" />
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* BOTTOM HALF: EXTRA SETTINGS (No Scroll, Flex Layout) */}
                        <div className="h-1/2 bg-neutral-900 flex flex-col px-6 pt-4 pb-4 overflow-hidden relative">
                            
                            <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full gap-2">
                                
                                {/* 1. Repeat Probability Slider - Redesigned to match RGB sliders */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium text-neutral-400 uppercase tracking-wide px-1">
                                        <span>Повтор</span>
                                    </div>
                                    <div className="h-14 bg-white rounded-xl relative overflow-hidden flex items-center justify-center">
                                        {/* Range Input Overlay */}
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="1"
                                            value={state.repeatChance}
                                            onChange={(e) => handleRepeatChanceChange(Number(e.target.value))}
                                            className="w-full h-full absolute inset-0 opacity-0 z-30 cursor-pointer"
                                        />
                                        
                                        {/* Fill Bar - Blue overlay */}
                                        <div 
                                            className="absolute inset-0 pointer-events-none transition-opacity duration-75 bg-blue-500"
                                            style={{ opacity: state.repeatChance / 100 }}
                                        ></div>
                                        
                                        {/* The Tick Mark (Black thin line) */}
                                        <div 
                                            className="absolute top-0 bottom-0 w-0.5 bg-black z-10 pointer-events-none"
                                            style={{ left: `${state.repeatChance}%` }}
                                        />

                                        {/* Centered Value */}
                                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                            <span className="text-2xl font-bold text-black font-mono tracking-tighter">
                                                {state.repeatChance}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Custom Symbols (Bottom LETTERS) */}
                                <div className="space-y-1">
                                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide px-1">Свои Буквы (Низ)</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Л', 'П', 'О', 'В'].map((key) => (
                                            <div key={key} className="flex flex-col gap-0.5">
                                                <input 
                                                    type="text" 
                                                    maxLength={1}
                                                    placeholder={ACTION_LABELS[key][0]} // Show first letter of default label
                                                    value={state.customActionsLetters[key] || ''}
                                                    onChange={(e) => handleCustomActionChange(key, e.target.value, 'letter')}
                                                    className="w-full h-12 bg-neutral-800 rounded-lg text-center text-xl font-bold text-white border border-transparent focus:border-blue-500 focus:outline-none placeholder-neutral-600 uppercase"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                 {/* 3. Custom Symbols (Bottom ARROWS) */}
                                 <div className="space-y-1">
                                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide px-1">Свои Стрелки (Низ)</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Л', 'П', 'О', 'В'].map((key) => (
                                            <div key={key} className="flex flex-col gap-0.5">
                                                <input 
                                                    type="text" 
                                                    maxLength={1}
                                                    placeholder="Icon" 
                                                    value={state.customActionsArrows[key] || ''}
                                                    onChange={(e) => handleCustomActionChange(key, e.target.value, 'arrow')}
                                                    className="w-full h-12 bg-neutral-800 rounded-lg text-center text-xl font-bold text-white border border-transparent focus:border-blue-500 focus:outline-none placeholder-neutral-600 uppercase"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Background Settings (Buttons) */}
                                <div className="space-y-1 mt-1">
                                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide px-1">Фон</div>
                                    <div className="grid grid-cols-3 gap-2 h-12">
                                        <button 
                                            onClick={() => setBackgroundMode('black')} 
                                            className={`rounded-lg bg-black text-xs font-bold uppercase transition-all border-2 ${state.backgroundMode === 'black' ? 'border-blue-500 text-white' : 'border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                                        >
                                            Black
                                        </button>
                                        <button 
                                            onClick={() => setBackgroundMode('dark')} 
                                            className={`rounded-lg bg-neutral-900 text-xs font-bold uppercase transition-all border-2 ${state.backgroundMode === 'dark' ? 'border-blue-500 text-white' : 'border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                                        >
                                            Dark
                                        </button>
                                        <button 
                                            onClick={() => setBackgroundMode('gray')} 
                                            className={`rounded-lg bg-neutral-800 text-xs font-bold uppercase transition-all border-2 ${state.backgroundMode === 'gray' ? 'border-blue-500 text-white' : 'border-neutral-700 text-neutral-500 hover:border-neutral-600'}`}
                                        >
                                            Gray
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                ) : (
                    // --- NORMAL GAME MODES ---
                    isGridMode ? (
                        <div
                            className={`relative grid w-full h-full ${getGridClasses(state.reactionState.gridSize)} ${state.reactionState.isGridVisible ? 'gap-px border' : ''}`}
                            style={state.reactionState.isGridVisible ? { backgroundColor: gridLineColor, borderColor: gridLineColor } : {}}
                            onTouchStart={handleReactionGestureStart}
                            onTouchMove={handleReactionGestureMove}
                            onTouchEnd={handleReactionGestureEnd}
                        >
                            {[...Array(state.reactionState.gridSize).keys()].map(i => {
                                const { activeQuadrant, activeColor, activeText, successFlashQuadrant, successFlashColor, errorFlash } = state.reactionState;
                                const backgroundColor = errorFlash ? 'rgba(239, 68, 68, 0.5)'
                                    : successFlashQuadrant === i ? successFlashColor
                                    : activeQuadrant === i ? activeColor
                                    : 'transparent';
                                
                                return (
                                    <div key={i} className={`${state.backgroundMode === 'black' ? 'bg-black' : state.backgroundMode === 'gray' ? 'bg-neutral-800' : 'bg-neutral-900'}`} onTouchStart={(e) => handleQuadrantTap(i, e)}>
                                        <div className="relative w-full h-full" style={{ backgroundColor }}>
                                            {activeQuadrant === i && activeText && (
                                                <div className="absolute inset-0 flex items-center justify-center text-neutral-100 font-bold pointer-events-none select-none" style={reactionTextStyle}>
                                                    {activeText}
                                                </div>
                                            )}
                                            {isAdjustingGridFontSize && (
                                                <div className="absolute inset-0 flex items-center justify-center text-neutral-400 font-bold pointer-events-none select-none" style={reactionTextStyle}>
                                                    {previewChars.current[i]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Moving Dot */}
                            {state.reactionState.isRunning && state.reactionState.isMovingDotActive && (
                                 <div className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none" style={{
                                    top: `${state.reactionState.dotPosition.y}%`,
                                    left: `${state.reactionState.dotPosition.x}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}></div>
                            )}
                        </div>
                    ) : state.displayMode === 'position' ? (
                        // POSITION MODE - STABLE RENDERING
                        <>
                            {/* Calibration Overlay - Visible when Gesturing (Arrows instead of letters L O P) */}
                            <div className={`absolute inset-0 transition-opacity duration-200 ${(isGestureActive) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <div className="absolute text-neutral-500" style={{ ...letterStyle, top: '50%', left: `${50 - state.positionOffset}%`, transform: 'translate(-50%, -50%)' }}>
                                    <ArrowIcon type="Л" className="w-[1em] h-[1em]" />
                                </div>
                                <div className="absolute text-neutral-500" style={{ ...letterStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                    <ArrowIcon type="О" className="w-[1em] h-[1em]" />
                                </div>
                                <div className="absolute text-neutral-500" style={{ ...letterStyle, top: '50%', left: `${50 + state.positionOffset}%`, transform: 'translate(-50%, -50%)' }}>
                                    <ArrowIcon type="П" className="w-[1em] h-[1em]" />
                                </div>
                            </div>

                            {/* Game Content - Visible when NOT adjusting */}
                            {/* Fixed: Opacity becomes 0 instantly when gesture is active, 100 otherwise */}
                            <div className={`absolute inset-0 transition-opacity ${isGestureActive ? 'duration-0' : 'duration-150'} ${state.isLetterVisible && !isGestureActive ? 'opacity-100' : 'opacity-0'}`}>
                                
                                {state.arrowMode === 'random' ? (
                                    // NEW MODE: Symbol Center, Arrow Side
                                    <>
                                        {/* Symbol - Always Center */}
                                        <div 
                                            className={`absolute ${state.contentMode === 'circle' ? 'rounded-full' : 'font-medium text-neutral-200'}`}
                                            style={{ 
                                                ...letterStyle, 
                                                top: '50%', 
                                                left: '50%', 
                                                transform: 'translate(-50%, -50%)',
                                                backgroundColor: state.contentMode === 'circle' ? state.circleColor : undefined,
                                                width: state.contentMode === 'circle' ? `${state.fontSizeVh}vh` : undefined,
                                                height: state.contentMode === 'circle' ? `${state.fontSizeVh}vh` : undefined,
                                            }}
                                        >
                                            {state.contentMode !== 'circle' && state.letter}
                                        </div>
                                        
                                        {/* Arrow - Random Side */}
                                        <div 
                                            className="absolute text-neutral-500"
                                            style={{
                                                ...letterStyle,
                                                top: '50%',
                                                left: state.arrowSide === 'left' ? `${50 - state.positionOffset}%` : `${50 + state.positionOffset}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        >
                                            <DirectionArrow direction={state.randomArrowDirection} />
                                        </div>
                                    </>
                                ) : (
                                    // STANDARD MODE: Symbol Moves
                                    <div 
                                        className={`absolute ${state.contentMode === 'circle' ? 'rounded-full' : 'font-medium text-neutral-200'}`}
                                        style={{ 
                                            ...letterStyle, 
                                            top: '50%', 
                                            left: state.action === 'Л' ? `${50 - state.positionOffset}%` : state.action === 'П' ? `${50 + state.positionOffset}%` : '50%', 
                                            transform: 'translate(-50%, -50%)',
                                            backgroundColor: state.contentMode === 'circle' ? state.circleColor : undefined,
                                            width: state.contentMode === 'circle' ? `${state.fontSizeVh}vh` : undefined,
                                            height: state.contentMode === 'circle' ? `${state.fontSizeVh}vh` : undefined,
                                        }}
                                    >
                                        {state.contentMode !== 'circle' && state.letter}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // DEFAULT & COLOR MODES
                        // Forced visibility if gesture active
                        <div className={`flex flex-col items-center justify-center transition-opacity duration-75 ${state.isLetterVisible || isGestureActive ? 'opacity-100' : 'opacity-0'}`}>
                                {state.contentMode === 'circle' ? (
                                    // Circle Render
                                    <>
                                        <div style={{
                                            width: `${state.fontSizeVh}vh`,
                                            height: `${state.fontSizeVh}vh`,
                                            fontSize: `${state.fontSizeVh}vh`,
                                            backgroundColor: state.circleColor,
                                            borderRadius: '9999px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: state.arrowMode === 'inside' ? getContrastColor(state.circleColor) : undefined
                                        }}>
                                             {state.arrowMode === 'inside' && renderActionContent()}
                                        </div>
                                        {state.arrowMode === 'below' && (
                                            <div style={actionStyle} className="text-center font-medium text-neutral-500 flex items-center justify-center">
                                                {renderActionContent()}
                                            </div>
                                        )}
                                        {state.arrowMode === 'off' && (
                                            <div style={actionStyle} className="text-center font-medium text-neutral-500 flex items-center justify-center">
                                                {renderActionContent()}
                                            </div>
                                        )}
                                    </>
                                ) : state.displayMode === 'color' ? (
                                    // Text Render for Color Mode
                                    <div style={{ ...letterStyle, color: state.colors[state.action] }} className="text-center font-medium">{state.letter}</div>
                                ) : (
                                    // Text Render for Default Mode
                                    <>
                                        <div style={letterStyle} className="text-center font-medium text-neutral-200">{state.letter}</div>
                                        <div style={actionStyle} className="text-center font-medium text-neutral-500 flex items-center justify-center">{renderActionContent()}</div>
                                    </>
                                )}
                        </div>
                    )
                )}

                {/* Footer Hint */}
                {!state.isColorEditorVisible && (
                     <div className={`absolute bottom-1 w-full text-center text-xs text-neutral-700 pointer-events-none ${!isGestureActive && !state.isRunning && !state.reactionState.isRunning ? 'opacity-100' : 'opacity-0'}`}>
                        {!isGridMode && <>↑↓ Размер{state.displayMode === 'default' && <>&nbsp; &nbsp; ↔ Отступ</>}{state.displayMode === 'position' && <>&nbsp; &nbsp; ↔ Разнос</>}&nbsp; &nbsp; 2×Тап Сброс&nbsp; &nbsp; Долгий тап: Точка</>}
                         {isGridMode && <>↑↓ Размер&nbsp; &nbsp; ↔ Яркость&nbsp; &nbsp; 1×Тап Сетка&nbsp; &nbsp; 2×Тап Движ.&nbsp; &nbsp; Долгий тап: Точка</>}
                    </div>
                )}
            </div>

             {/* --- CONTROLS FOOTER --- */}
            {!state.isColorEditorVisible && (
            <div 
                className={`flex-shrink-0 p-4 rounded-3xl flex flex-col w-full max-w-lg mx-auto relative z-20 transition-all duration-200
                    ${controlsVisibilityMode === 0 ? (state.backgroundMode === 'black' ? 'bg-neutral-900 shadow-[0_-8px_30px_rgba(255,255,255,0.05)]' : 'bg-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]') : 'bg-transparent'}
                    ${controlsVisibilityMode === 2 ? 'opacity-0 pointer-events-auto' : 'opacity-100'}
                `}
                onClick={(e) => {
                    if (controlsVisibilityMode === 2) {
                        setControlsVisibilityMode(0);
                    }
                }}
            >
                    {/* --- NORMAL SLIDERS GRID --- */}
                    <div className={`relative transition-opacity duration-200 mb-0 ${controlsVisibilityMode === 2 ? 'pointer-events-none' : ''}`}>
                        {isGridMode ? (
                             <div className="grid grid-cols-2 gap-3">
                                <SliderBox type='r_min' value={currentReactionSettings.minDelay} config={SLIDER_CONFIG.r_min} onValueChange={handleSliderChange} labelOverride={isMemoryMode ? 'Задержка' : (currentReactionSettings.isFixedDelay ? 'Задержка' : undefined)} />
                                <SliderBox type='r_show' value={currentReactionSettings.isShowTimeLinkedToDelay ? currentReactionSettings.minDelay : currentReactionSettings.showTime} config={SLIDER_CONFIG.r_show} onValueChange={handleSliderChange} onTap={handleShowTimeLinkToggle} isDisabled={currentReactionSettings.isShowTimeLinkedToDelay} infinityThreshold={currentReactionSettings.minDelay} />
                                <SliderBox type='r_max' value={currentReactionSettings.maxDelay} config={SLIDER_CONFIG.r_max} onValueChange={handleSliderChange} onTap={handleReactionDelayModeToggle} isDisabled={isMemoryMode || currentReactionSettings.isFixedDelay} />
                                {/* Replaced Start Button with Dot Speed Slider in Reaction Mode */}
                                <SliderBox type='r_speed' value={state.reactionState.dotSpeed} config={SLIDER_CONFIG.r_speed} onValueChange={handleSliderChange} labelOverride="Ск. точки" onTap={handleDotToggle} isDisabled={!state.reactionState.isMovingDotActive} />
                             </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <SliderBox type='speed' value={state.isRunning ? state.currentDelay / 1000 : state.baseSpeed} config={SLIDER_CONFIG.speed} onValueChange={handleSliderChange} />
                                <SliderBox type='dur' value={state.displayDuration} config={SLIDER_CONFIG.dur} onValueChange={handleSliderChange} onTap={handleDisplayToggle} isDisabled={!state.isDisplayActive} infinityThreshold={state.baseSpeed} />
                                <SliderBox type='dec' value={state.decrement} config={SLIDER_CONFIG.dec} onValueChange={handleSliderChange} onTap={handleAccelerationToggle} isDisabled={!state.isAccelerationActive} />
                                <SliderBox type='int' value={state.interval} config={SLIDER_CONFIG.int} onValueChange={handleSliderChange} onTap={handleAccelerationToggle} isDisabled={!state.isAccelerationActive || state.decrement <= 0} />
                            </div>
                        )}

                        {/* --- ROUND START BUTTON (MOVED INSIDE SLIDERS CONTAINER FOR CENTERING) --- */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                            <div 
                                className={`w-16 h-16 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer border-4 border-neutral-800
                                    ${isAnyRunning ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}
                                onTouchStart={handleStartButtonPressStart}
                                onTouchEnd={handleStartButtonPressEnd}
                            >
                                {/* Power Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                                    <line x1="12" y1="2" x2="12" y2="12" />
                                </svg>
                            </div>
                        </div>

                    </div>
                    
                    {/* --- SENSITIVE TRANSPARENCY TOGGLE AREA (Gap between sliders and buttons) --- */}
                    <div 
                        className="h-6 w-full flex-shrink-0 z-10" 
                        onClick={(e) => {
                             if (controlsVisibilityMode !== 2) {
                                 e.stopPropagation();
                                 handleControlsAreaTap(e);
                             }
                        }}
                    ></div>

                    {/* --- BOTTOM ROW CONTROLS --- */}
                    <div className={`mt-0 pt-3 border-t border-neutral-700/50 transition-opacity duration-200 ${controlsVisibilityMode === 2 ? 'pointer-events-none' : ''}`}>
                         {isGridMode ? (
                            <div className="flex items-center gap-2 px-1 h-8 w-full">
                                <button
                                    onTouchStart={(e) => handlePressStart(toggleObservationMode, e)}
                                    onTouchEnd={(e) => handlePressEnd(handleNextStimulusMode, e)}
                                    className={`${commonButtonClasses} flex-1 min-w-0 ${state.reactionState.isObservationMode ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                                >
                                    {state.reactionState.stimulusMode}
                                </button>
                                <button
                                    onTouchStart={(e) => handlePressStart(handleToggleMemoryMode, e)}
                                    onTouchEnd={(e) => handlePressEnd(handleChangeMemoryLength, e)}
                                    className={`${commonButtonClasses} flex-1 min-w-0 ${state.reactionState.isMemoryMode ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                                >
                                    {state.reactionState.isMemoryMode ? state.reactionState.memorySequenceLength : 'Память'}
                                </button>
                                <button
                                    onTouchStart={(e) => handlePressStart(handlePrevGridSize, e)}
                                    onTouchEnd={(e) => handlePressEnd(handleNextGridSize, e)}
                                    className={`${commonButtonClasses} flex-1 min-w-0`}
                                >
                                    Сетка: {state.reactionState.gridSize}
                                </button>
                                <button
                                    onTouchStart={(e) => handlePressStart(handlePrevDisplayMode, e)}
                                    onTouchEnd={(e) => handlePressEnd(handleNextDisplayMode, e)}
                                    aria-label="Сменить режим"
                                    className={`${commonButtonClasses} flex-1 min-w-0`}
                                >
                                    {displayModeLabels[state.displayMode]}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 px-1 h-8 w-full">
                                {/* Left Column: Content Mode Button - Always Col 1 */}
                                <button 
                                    onTouchStart={(e) => {
                                        // If content mode is letter, long press toggles Hard Letters
                                        if (state.contentMode === 'letter') {
                                            handlePressStart(toggleHardLetters, e);
                                        } else {
                                            handlePressStart(() => handleContentModeChange(false), e);
                                        }
                                    }}
                                    onTouchEnd={(e) => handlePressEnd(() => handleContentModeChange(true), e)} // Short press: Next
                                    className={`col-span-1 ${commonButtonClasses} w-full`}
                                >
                                    {contentModeLabels[state.contentMode]}
                                </button>
                                
                                {/* Middle Area: Cols 2-3 */}
                                <div className="col-span-2 flex items-center justify-center min-w-0">
                                    {state.displayMode === 'default' || state.displayMode === 'position' ? (
                                        <button
                                            onTouchStart={(e) => handlePressStart(toggleFourArrows, e)}
                                            onTouchEnd={(e) => { e.stopPropagation(); handlePressEnd(handleArrowsToggle, undefined); }}
                                            style={{ width: 'calc(50% - 0.25rem)' }}
                                            className={`${commonButtonClasses}`}
                                        >
                                            {state.arrowMode === 'inside' ? (
                                                <div className="flex items-center justify-center relative">
                                                     <div className="w-5 h-5 border-2 border-white/40 rounded-full absolute"></div>
                                                     {/* Fixed: Hardcoded Right Arrow so icon doesn't flip on button */}
                                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 z-10">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                                    </svg>
                                                </div>
                                            ) : state.arrowMode === 'below' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                                </svg>
                                            ) : state.arrowMode === 'random' ? (
                                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                                </svg>
                                            ) : (
                                                'АБВ'
                                            )}
                                        </button>
                                    ) : state.displayMode === 'color' ? (
                                        state.isColorModeSettingsActive ? (
                                             // In settings mode
                                            <button
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onTouchEnd={(e) => { e.stopPropagation(); setState(s => ({ ...s, isColorModeSettingsActive: false })); }}
                                                className={`${commonButtonClasses} w-full`}
                                            >
                                                Назад
                                            </button>
                                        ) : (
                                            // 3 Color Buttons filling the middle space
                                            <div className="flex w-full gap-2 h-full">
                                                {['Л', 'О', 'П'].map(action => (
                                                    <button 
                                                        key={action} 
                                                        onTouchStart={(e) => handlePressStart(() => handleChangeColor(action, -1), e)} // Long press: Prev Color
                                                        onTouchEnd={(e) => handlePressEnd(() => handleChangeColor(action, 1), e)} // Short press: Next Color & Content
                                                        onContextMenu={(e) => e.preventDefault()}
                                                        className="flex-1 h-full rounded-md flex items-center justify-center text-neutral-900 shadow-md transition-transform active:scale-90 focus:outline-none select-none"
                                                        style={{ backgroundColor: state.colors[action] }} 
                                                        aria-label={`Изменить цвет для ${ACTION_LABELS[action]}`}
                                                    >
                                                        {/* Render Arrow Icon instead of Text, Dark Color */}
                                                        <ArrowIcon type={action} className="w-5 h-5 text-neutral-900/80" />
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        // Position mode handled above in shared logic
                                        null
                                    )}
                                </div>

                                {/* Right Column: Display Mode Button - Always Col 4 */}
                                <button
                                    onTouchStart={(e) => handlePressStart(handlePrevDisplayMode, e)}
                                    onTouchEnd={(e) => handlePressEnd(handleNextDisplayMode, e)}
                                    aria-label="Сменить режим" className={`col-span-1 ${commonButtonClasses} w-full`}
                                >
                                    {displayModeLabels[state.displayMode]}
                                </button>
                            </div>
                        )}
                    </div>
            </div>
            )}
        </div>
    );
};

export default App;
