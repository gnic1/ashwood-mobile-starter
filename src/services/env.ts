// src/services/env.ts
const FALLBACK_PORT = 3000;

// For the Android emulator, 10.0.2.2 maps to the host's localhost.
const EMULATOR_HOST = 'http://10.0.2.2';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  `${EMULATOR_HOST}:${FALLBACK_PORT}`;

export const OPENAI_BASE =
  process.env.EXPO_PUBLIC_OPENAI_BASE || API_BASE;

export const OPENAI_API_KEY =
  process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

