// Renamed from the old `function initApp()` to follow the naming convention.
function InitializeApp(root: HTMLElement): void {
  root.innerHTML = "<main id=\"app\"></main>";
}

function InitializeListeners(root: HTMLElement): void {
  root.addEventListener("click", () => console.log("clicked"));
}

const root = document.getElementById("root")!;
InitializeApp(root);
InitializeListeners(root);
