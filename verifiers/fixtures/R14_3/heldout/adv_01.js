const OLLAMA_URL = 'http://localhost:11434/api/generate';

const generateText = async ({ model, prompt }) => {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  const json = await res.json();
  return { text: json.response };
};

export async function tagline(product) {
  const { text } = await generateText({
    model: 'llama3',
    prompt: `Write a tagline for ${product}`,
  });
  return text.trim();
}
