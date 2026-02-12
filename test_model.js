const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        console.log('Testing gemini-flash-latest availability...');
        const result = await model.generateContent('Hello');
        console.log('Response:', result.response.text());
    } catch (e) {
        console.error('Error:', e);
    }
}

listModels();
