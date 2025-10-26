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

What is Lodash and why it is used here?
Lodash provides various inbuilt functions for collections, arrays, manipulated objects, and other utility methods that we can use directly instead of writing them from scratch. It makes it easier to iterate over the arrays, strings as well as objects. Its modular methods make the creation of composite functions easier.

Left to write are: where loadash is used in this project and why lodash especifically is used here?

Lodash Installation tip:
npm install lodash

Now in order to use the Lodash library, you need to require it in the code file.
const _ = require("lodash");

Nodejs version used: 22.0

Vercel Deployment Guide:
Uploaded to github and connected to vercel to deploy it.