/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        'btn': '6px',
                        'card': '12px',
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: '#0095F6',
                                hover: '#1877F2',
                                light: '#E0F1FF',
                                foreground: '#FFFFFF'
                        },
                        secondary: {
                                DEFAULT: '#737373',
                                light: '#F5F5F5',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: '#ED4956',
                                hover: '#DC2626',
                                foreground: '#FFFFFF'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        ig: {
                                blue: '#0095F6',
                                hoverBlue: '#1877F2',
                                red: '#ED4956',
                                borderLight: '#DBDBDB',
                                borderDark: '#262626',
                                bgDark: '#000000',
                                cardDark: '#121212',
                                textSecondary: '#737373',
                        },
                        neutral: {
                                50: '#FAFAFA',
                                100: '#F5F5F5',
                                200: '#E5E5E5',
                                300: '#D4D4D4',
                                400: '#A3A3A3',
                                500: '#737373',
                                600: '#525252',
                                700: '#404040',
                                800: '#262626',
                                900: '#171717',
                                950: '#0A0A0A',
                        },
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        brand: '#0095F6',
                        charcoal: '#262626',
                        cream: '#FAFAFA',
                },
                fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
                        body: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
                        mono: ['"Roboto Mono"', 'Courier New', 'monospace'],
                        script: ['"Grand Hotel"', 'Pacifico', 'cursive'],
                        serif: ['"Instrument Serif"', 'serif']
                },
                boxShadow: {
                        'card': '0 1px 2px rgba(0, 0, 0, 0.05)',
                        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
                        'button': '0 2px 4px rgba(0, 149, 246, 0.2)',
                        'button-hover': '0 4px 8px rgba(0, 149, 246, 0.3)',
                        'input-focus': '0 0 0 2px rgba(0, 149, 246, 0.25)',
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        },
                        'fade-in': {
                                from: {
                                        opacity: '0',
                                        transform: 'translateY(10px)'
                                },
                                to: {
                                        opacity: '1',
                                        transform: 'translateY(0)'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.3s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
