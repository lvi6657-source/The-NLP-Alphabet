
export type SliderType = 'dur' | 'speed' | 'dec' | 'int' | 'r_min' | 'r_max' | 'r_show' | 'r_speed';

export interface SliderConfig {
    min: number;
    max: number;
    format: (v: number) => string;
    step: number;
}

export type StimulusMode = 'цвет' | 'цифра' | 'буква' | 'обе' | 'все';
export type MemorySequenceLength = 2 | 3 | 4 | 5 | 6 | 7;
export type StimulusType = 'color' | 'digit' | 'letter';
export type ArrowMode = 'off' | 'inside' | 'below' | 'random';

export interface Stimulus {
    quadrant: number;
    type: StimulusType;
    value: string;
}

export interface ReactionModeSettings {
    minDelay: number;
    maxDelay: number;
    isFixedDelay: boolean;
    showTime: number;
    isShowTimeLinkedToDelay: boolean;
}

export interface ReactionState {
    isRunning: boolean;
    gridSize: 4 | 6 | 9 | 12 | 20 | 24 | 30 | 35 | 48 | 54 | 70 | 77 | 108 | 117 | 140 | 150;
    activeQuadrant: number | null;
    expectedQuadrant: number | null;
    activeColor: string;
    isWaitingForInput: boolean;
    roundStartTime: number | null;
    roundCount: number;
    totalReactionTime: number;
    avgReactionTime: number;
    bestReactionTime: number;
    avgReactionTimeLast20: number;
    last20Reactions: number[];
    errorFlash: boolean;
    successFlashQuadrant: number | null;
    successFlashColor: string;
    
    stimulusMode: StimulusMode;
    isMemoryMode: boolean;
    memorySequenceLength: MemorySequenceLength;
    activeText: string | null;
    
    sequence: Stimulus[];
    isShowingSequence: boolean;
    playerInputIndex: number;
    
    simpleModeSettings: ReactionModeSettings;
    memoryModeSettings: ReactionModeSettings;
    observationModeSettings: ReactionModeSettings;
    
    // Moved to AppState: isFocusDotVisible
    
    isObservationMode: boolean;
    gridBrightness: number;
    gridFontSizes: Record<number, number>;
    isGridVisible: boolean;

    // Integrated moving dot properties
    isMovingDotActive: boolean;
    dotSpeed: number; // New speed setting
    dotPosition: { x: number; y: number };
    dotVelocity: { vx: number; vy: number };
}

export interface AppState {
    isRunning: boolean;
    counter: number;
    baseSpeed: number;
    currentDelay: number;
    decrement: number;
    interval: number;
    displayDuration: number;
    isDisplayActive: boolean;
    fontSizeVh: number;
    lineSpacingEm: number;
    positionOffset: number;
    letter: string;
    action: string;
    isLetterVisible: boolean;
    displayMode: 'default' | 'color' | 'position' | 'reaction';
    contentMode: 'letter' | 'digit' | 'two_digits' | 'circle';
    circleColor: string;
    colors: Record<string, string>;
    isAccelerationActive: boolean;
    reactionState: ReactionState;
    isColorEditorVisible: boolean;
    colorPalette: string[];
    isColorModeSettingsActive: boolean;
    arrowMode: ArrowMode;
    randomArrowDirection: 'up' | 'down' | 'left' | 'right';
    arrowSide: 'left' | 'right';
    isFocusDotVisible: boolean; // Global setting
    excludeHardLetters: boolean; // No 'ь' and 'ъ'
    useFourArrows: boolean; // Includes Down arrow
    repeatChance: number; // 0 to 100%
    customActionsLetters: Record<string, string>; // Custom symbols when Arrows are OFF
    customActionsArrows: Record<string, string>; // Custom symbols when Arrows are ON
    backgroundMode: 'black' | 'dark' | 'gray'; // 3-way background
}
