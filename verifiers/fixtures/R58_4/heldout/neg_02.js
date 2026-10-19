const MAX_COLOR_DEPTH = 24;

// Clamp a requested bit depth to what the renderer supports.
function clampDepth(requested) {
  return Math.min(Math.max(requested, 1), MAX_COLOR_DEPTH);
}

module.exports = { clampDepth };
