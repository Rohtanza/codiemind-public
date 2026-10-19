// Normalise raw input before we initialise the layout.
function normaliseInput(raw) {
  return raw.trim().toLowerCase();
}

function initialiseLayout(container, title) {
  const heading = document.createElement("h1");
  heading.textContent = normaliseInput(title);
  heading.className = "centre-aligned";
  container.appendChild(heading);
  return heading;
}

module.exports = { normaliseInput, initialiseLayout };
