type ClickHandler = (event: MouseEvent) => void;

export function bindButton(selector: string, onClick: ClickHandler): HTMLButtonElement | null {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (button !== null) {
    button.addEventListener("click", onClick);
  }
  return button;
}
