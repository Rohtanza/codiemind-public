function buildPrompt(user) {
  const greeting = `Hello, ${user.name}!`;
  const question = "What is your favorite colour?";
  return [greeting, question].join(" ");
}

module.exports = { buildPrompt };
