/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                bg: {
                    primary: '#F5F0E8',
                    secondary: '#EDE4D4'
                },
                surface: '#FFFFFF',
                border: '#E0D4C0',
                accent: {
                    primary: '#C4622A',
                    dark: '#6B4226',
                    sand: '#D4B896',
                    dim: '#A0501F'
                },
                text: {
                    primary: '#1C1410',
                    secondary: '#6B4226',
                    muted: '#9A8070'
                },
                semantic: {
                    success: '#5A7A4A',
                    error: '#B84040',
                    warning: '#B8860B',
                    info: '#2A6CB4'
                }
            },
            fontFamily: {
                display: ['DMSerifDisplay-Regular'],
                body: ['DMSans-Regular'],
                medium: ['DMSans-Medium'],
                mono: ['JetBrainsMono-Regular']
            }
        },
    },
    plugins: [],
}
