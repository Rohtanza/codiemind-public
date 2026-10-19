import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function explainCode(code: string, onChunk: (s: string) => void) {
  const result = await model.generateContentStream(`Explain this code:\n${code}`);
  for await (const chunk of result.stream) {
    onChunk(chunk.text());
  }
}
