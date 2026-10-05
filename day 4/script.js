const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearButton = document.querySelector("#clear-btn");
const themeButton = document.querySelector("#theme-toggle");

const draftStorageKey = "notes-draft";
const themeStorageKey = "notes-theme";

function updateCounts() {
  const text = noteText.value;
  const characterLength = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = `${characterLength} / 200 characters`;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  charCount.classList.toggle("warning", characterLength > 180);
  charCount.classList.toggle("over", characterLength > 200);
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(draftStorageKey);
  updateCounts();
  noteText.focus();
}

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeButton.textContent = isDark ? "Light mode" : "Dark mode";
}

noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(draftStorageKey, noteText.value);
});

clearButton.addEventListener("click", clearNote);
noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNote();
  }
});

themeButton.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  setTheme(isDark);
  localStorage.setItem(themeStorageKey, isDark ? "dark" : "light");
});

const savedDraft = localStorage.getItem(draftStorageKey);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

setTheme(localStorage.getItem(themeStorageKey) === "dark");
updateCounts();
