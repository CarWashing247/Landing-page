const shell = document.querySelector(".admin-shell");
const menuButton = document.querySelector(".menu-button");

if (shell && menuButton) {
  menuButton.addEventListener("click", () => {
    const isOpen = shell.dataset.menuOpen === "true";
    shell.dataset.menuOpen = String(!isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shell.dataset.menuOpen === "true") {
      shell.dataset.menuOpen = "false";
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.focus();
    }
  });
}
