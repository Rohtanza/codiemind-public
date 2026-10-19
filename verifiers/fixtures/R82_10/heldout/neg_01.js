export const handleKeyDown = (event, actions) => {
  if (event.key === "Enter") {
    if (event.shiftKey) {
      actions.newline();
    } else {
      actions.submit();
    }
  }
};
