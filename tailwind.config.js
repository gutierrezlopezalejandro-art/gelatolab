/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:    { DEFAULT: '#0f1a12', 2: '#3d5040', 3: '#7a9480' },
        cream:  { DEFAULT: '#f5f0e8', 2: '#ece6d8', 3: '#e0d8c8' },
        mint:   { DEFAULT: '#1a5c3a', 2: '#2d7a52', 3: '#c8e8d4' },
        gold:   { DEFAULT: '#b8860b', 2: '#f5e6a0' },
        coral:  { DEFAULT: '#c0392b', 2: '#fdecea' },
        teal:   { DEFAULT: '#0d5c6e', 2: '#d4eef5' },
      },
      fontFamily: {
        display: ["'Playfair Display'", 'serif'],
        body:    ["'Outfit'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};
