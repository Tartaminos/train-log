export const theme = {
  colors: {
    background: '#0F1115',
    surface: '#1A1D23',
    card: '#222630',
    primary: '#66b939ff',
    secondary: '#457B9D',
    textPrimary: '#F1FAEE',
    textSecondary: '#A8B2C1',
    border: '#2F3540',
    error: '#FF4B5C',
    success: '#2ECC71'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999
  }
} as const;

export type AppTheme = typeof theme;
