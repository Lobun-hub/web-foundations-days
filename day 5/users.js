const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];
let usersLoaded = false;

function renderUsers(list) {
  usersList.replaceChildren();

  for (const user of list) {
    const listItem = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    listItem.append(name, email, city, company);
    usersList.append(listItem);
  }
}

async function loadUsers() {
  loadButton.disabled = true;
  users = [];
  usersLoaded = false;
  statusMessage.textContent = "Loading users...";
  usersList.replaceChildren();

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    users = await response.json();
    usersLoaded = true;
    renderUsers(users);
    statusMessage.textContent = `Loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    usersLoaded = false;
    renderUsers(users);
    statusMessage.textContent = `Unable to load users: ${
      error instanceof Error ? error.message : String(error)
    }`;
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", () => {
  const searchText = filterInput.value.trim().toLowerCase();
  const matchingUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchText),
  );

  renderUsers(matchingUsers);
  if (!usersLoaded) {
    return;
  }

  if (matchingUsers.length === 0) {
    statusMessage.textContent = "No users match your filter.";
  } else {
    statusMessage.textContent = `Showing ${matchingUsers.length} of ${users.length} users.`;
  }
});
