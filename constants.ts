
import type { SliderConfig, SliderType, StimulusMode, MemorySequenceLength } from './types';

export const RUSSIAN_ALPHABET: string[] = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'];
export const RUSSIAN_ALPHABET_NO_HARD: string[] = RUSSIAN_ALPHABET.filter(l => l !== 'Ъ' && l !== 'Ь');

export const NUMBERS: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const ACTIONS: string[] = ['Л', 'П', 'О'];
export const ACTIONS_4: string[] = ['Л', 'П', 'О', 'В']; // В = Вниз (Down)

export const DIRECTIONS: string[] = ['up', 'down', 'left', 'right'];
export const STORAGE_KEY: string = 'alphabetTrainerState';

export const STIMULUS_MODES: StimulusMode[] = ['цвет', 'цифра', 'буква', 'обе', 'все'];
export const MEMORY_SEQUENCE_LENGTHS: MemorySequenceLength[] = [2, 3, 4, 5, 6, 7];

export const SLIDER_CONFIG: Record<SliderType, SliderConfig> = {
    dur:   { min: 0.01, max: 3.0,  format: v => v.toFixed(2), step: 0.01 },
    speed: { min: 0.1,  max: 3.0,  format: v => v.toFixed(2), step: 0.01 },
    dec:   { min: 0,    max: 0.05, format: v => v.toFixed(3), step: 0.001 },
    int:   { min: 0,    max: 120,  format: v => Math.round(v).toString(), step: 1 },
    r_min: { min: 0.1,  max: 5.0,  format: v => v.toFixed(2), step: 0.01 },
    r_max: { min: 0.2,  max: 10.0, format: v => v.toFixed(2), step: 0.01 },
    r_show: { min: 0.05, max: 5.0, format: v => v.toFixed(2), step: 0.01 },
    r_speed: { min: 5,   max: 100, format: v => v.toFixed(0), step: 1 }
};

export const ACTION_LABELS: Record<string, string> = {
    'Л': 'Лево',
    'П': 'Право',
    'О': 'Оба',
    'В': 'Вниз'
};

// Standard Rainbow Palette (7 Colors)
export const DEFAULT_COLOR_PALETTE: string[] = [
    '#FF0000', // Red (Красный)
    '#FF7F00', // Orange (Оранжевый)
    '#FFFF00', // Yellow (Желтый)
    '#00FF00', // Green (Зеленый)
    '#00FFFF', // Cyan/Light Blue (Голубой)
    '#0000FF', // Blue (Синий)
    '#8B00FF'  // Violet (Фиолетовый)
];

export const COLOR_NAMES: string[] = [
    'Красный',
    'Оранжевый',
    'Желтый',
    'Зеленый',
    'Голубой',
    'Синий',
    'Фиолетовый'
];

export const DEFAULT_COLORS: Record<string, string> = {
    'Л': DEFAULT_COLOR_PALETTE[5], // Blue
    'П': DEFAULT_COLOR_PALETTE[0], // Red
    'О': DEFAULT_COLOR_PALETTE[3], // Green
    'В': DEFAULT_COLOR_PALETTE[1]  // Orange (Default for Down)
};
