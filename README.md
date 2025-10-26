Building another nlp analyzer as well- remaining to solve environment problem.
This project automates data analysis and makes no code data preprocessing.

Raw Text
↓
Cleaning & Normalization
↓
Tokenization
↓
Lemmatization/Stemming
↓
Stopword/Noise Removal
↓
Spelling/Slang Correction
↓
Augmentation (Optional)
↓
Vectorization/Embedding
↓
Padding & Model-Ready Format


Time series is all about data analysis- auto corellation plot, looking for trend,cycle and seasonality

Lucide-React - It is a library full of different icons. 
Installation tip: npm install lucide-react

Tailwind is also installed:
npm install -D tailwindcss postcss autoprefixer vite
npx tailwindcss init -p

In tailwind.config.js:
        /** @type {import('tailwindcss').Config} */
        module.exports = {
          content: [
            "./index.html",
            "./src/**/*.{js,ts,jsx,tsx}", // Adjust based on your project structure
          ],
          theme: {
            extend: {},
          },
          plugins: [],
        }

In index.css: 
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

In main.jsx:
import './index.css'; 