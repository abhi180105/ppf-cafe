// Vitest Setup File
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.stubGlobal('import.meta', {
    env: {
        VITE_SUPABASE_URL: 'https://test.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_SHEET_API_URL: 'https://script.google.com/macros/s/test/exec',
        VITE_WHATSAPP_NUMBER: '917409945954',
        VITE_API_SECRET: 'test-secret',
        VITE_APP_NAME: 'Prime Patties & Foods',
        VITE_DEV_EMAIL: 'test@example.com',
        VITE_DEFAULT_OPEN_TIME: '10:00',
        VITE_DEFAULT_CLOSE_TIME: '23:00',
        VITE_THEME: 'system',
        VITE_DEV_NAME: 'Test User',
    },
});

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Mock window.open
window.open = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Suppress console.error in tests unless needed
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return;
        originalError.call(console, ...args);
    };
});
afterAll(() => {
    console.error = originalError;
});