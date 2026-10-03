let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];
const initialNotes = notes;

function searchNotes(word) {
  const searchTerm = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(searchTerm));
}

function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

function getSummary() {
  const counts = countByCategory();
  const noteWord = notes.length === 1 ? "note" : "notes";
  return `${notes.length} ${noteWord}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

function isDuplicate(text) {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, " ");
  return notes.some(
    (note) => note.text.trim().toLowerCase().replace(/\s+/g, " ") === normalizedText,
  );
}

function addNote(text, category) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note not added: text must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(trimmedText)) {
    console.log("Note not added: duplicate text.");
    return false;
  }
  if (!["personal", "work", "study"].includes(category)) {
    console.log("Note not added: invalid category.");
    return false;
  }

  const nextId = notes.reduce((highestId, note) => Math.max(highestId, note.id), 0) + 1;
  notes.push({ id: nextId, text: trimmedText, category });
  return true;
}

console.log(searchNotes("JAVASCRIPT")); // [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]
console.log(searchNotes("missing")); // []

console.log(longestNote()); // { id: 3, text: "Email the project report to Grace", category: "work" }
notes = [];
console.log(longestNote()); // null
notes = initialNotes;

console.log(countByCategory()); // { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory()); // {}
notes = initialNotes;

console.log(getSummary()); // "5 notes: 2 personal, 1 work, 2 study."
notes = [{ id: 1, text: "Just one", category: "personal" }];
console.log(getSummary()); // "1 note: 1 personal, 0 work, 0 study."
notes = initialNotes;

console.log(isDuplicate("  BUY   milk and bread  ")); // true
console.log(isDuplicate("Plan a picnic")); // false

console.log(addNote("Plan a picnic", "personal")); // true
console.log(addNote("  PLAN   A PICNIC ", "work")); // Note not added: duplicate text. false
console.log(addNote("Read a book", "other")); // Note not added: invalid category. false
console.log(addNote("", "study")); // Note not added: text must be 1-200 characters. false
