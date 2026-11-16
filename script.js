// Formation positions: [x, y] in % of the pitch.
// The first spot is always the goalkeeper, then defence -> attack.
const formations = {
  "4-3-3": [
    [50, 88],
    [15, 69], [38, 72], [62, 72], [85, 69],
    [25, 50], [50, 55], [75, 50],
    [18, 27], [50, 25], [82, 27],
  ],
  "4-4-2": [
    [50, 88],
    [15, 69], [38, 72], [62, 72], [85, 69],
    [15, 48], [38, 52], [62, 52], [85, 48],
    [35, 25], [65, 25],
  ],
  "4-2-3-1": [
    [50, 88],
    [15, 69], [38, 72], [62, 72], [85, 69],
    [35, 57], [65, 57],
    [18, 40], [50, 40], [82, 40],
    [50, 21],
  ],
  "3-5-2": [
    [50, 88],
    [25, 72], [50, 74], [75, 72],
    [10, 48], [30, 55], [50, 47], [70, 55], [90, 48],
    [35, 25], [65, 25],
  ],
  "3-4-3": [
    [50, 88],
    [25, 72], [50, 74], [75, 72],
    [15, 50], [38, 53], [62, 53], [85, 50],
    [18, 27], [50, 25], [82, 27],
  ],
  "5-3-2": [
    [50, 88],
    [8, 64], [29, 72], [50, 74], [71, 72], [92, 64],
    [25, 50], [50, 53], [75, 50],
    [35, 25], [65, 25],
  ],
};

// Default lineup (used the first time, or after "Reset everything")
const defaultLineup = {
  teamName: "POLICE NATIONAL FC",
  subtitle: "SERVICE WITH INTEGRITY",
  footer: "2026 • FOOTBALL PRESENTATION",
  flag: "",
  flagImage: "assets/logos/logo.jpeg",
  formation: "4-3-3",
  players: [
    { name: "Goalkeeper", number: 1 },
    { name: "Defender 1", number: 2 },
    { name: "Defender 2", number: 4 },
    { name: "Defender 3", number: 5 },
    { name: "Defender 4", number: 3 },
    { name: "Midfielder 1", number: 6 },
    { name: "Midfielder 2", number: 8 },
    { name: "Midfielder 3", number: 10 },
    { name: "Forward 1", number: 11 },
    { name: "Forward 2", number: 9 },
    { name: "Forward 3", number: 7 },
  ],
  subs: [
    { name: "Substitute 1", number: 12 },
    { name: "Substitute 2", number: 13 },
    { name: "Substitute 3", number: 14 },
    { name: "Substitute 4", number: 15 },
    { name: "Substitute 5", number: 16 },
  ],
};

const STORAGE_KEY = "football-lineup-generator";
const MAX_SUBS = 12;

// Get elements from HTML
const pitch = document.getElementById("pitch");
const playerContainer = document.getElementById("players-container");
const playerInputs = document.getElementById("player-inputs");
const subInputs = document.getElementById("sub-inputs");
const addSubButton = document.getElementById("add-sub-btn");

const teamNameInput = document.getElementById("team-name-input");
const subtitleInput = document.getElementById("team-subtitle-input");
const footerInput = document.getElementById("footer-input");
const flagInput = document.getElementById("flag-input");
const flagImageInput = document.getElementById("flag-image-input");
const formationSelect = document.getElementById("formation-select");

let lineup = loadLineup();

// ---------- Saving & loading ----------

function copyDefaultLineup() {
  const copy = JSON.parse(JSON.stringify(defaultLineup));
  placePlayers(copy);
  return copy;
}

function loadLineup() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.players && saved.players.length === 11) {
      // Lineups saved before substitutes existed get the default bench
      if (!saved.subs) {
        saved.subs = JSON.parse(JSON.stringify(defaultLineup.subs));
      }
      // Lineups saved with the old Mexico placeholder get the club details
      if (/MEXICO/i.test(saved.teamName || "")) {
        saved.teamName = defaultLineup.teamName;
      }
      if (/NATIONAL TEAM/i.test(saved.subtitle || "")) {
        saved.subtitle = defaultLineup.subtitle;
      }
      if (/^(MX|MEX|🇲🇽)$/i.test((saved.flag || "").trim())) {
        saved.flag = defaultLineup.flag;
        saved.flagImage = saved.flagImage || defaultLineup.flagImage;
      }
      if (!saved.flagImage && !saved.flag) {
        saved.flagImage = defaultLineup.flagImage;
      }
      return saved;
    }
  } catch (error) {
    // Nothing saved yet, or storage is blocked
  }
  return copyDefaultLineup();
}

function saveLineup() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lineup));
  } catch (error) {
    console.warn("Could not save lineup (images may be too large).", error);
  }
}

// ---------- Helpers ----------

// Put every player on the default spot for the current formation
function placePlayers(data) {
  const spots = formations[data.formation];
  data.players.forEach(function (player, index) {
    player.x = spots[index][0];
    player.y = spots[index][1];
  });
}

// "Guillermo Ochoa" -> "GO", "Raúl" -> "RA"
function getInitials(player) {
  const words = player.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return String(player.number || "");
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Position label for each player, e.g. "4-2-3-1" -> GK, DEF x4, MID x5, FWD x1
function getRoles(formation) {
  const groups = formation.split("-").map(Number);
  const roles = ["GK"];
  groups.forEach(function (count, groupIndex) {
    let role = "MID";
    if (groupIndex === 0) role = "DEF";
    if (groupIndex === groups.length - 1) role = "FWD";
    for (let i = 0; i < count; i++) roles.push(role);
  });
  return roles;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Read an uploaded image and shrink it so it fits in browser storage
function readImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      const maxSize = 200;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/webp", 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ---------- Display ----------

function displayHeader() {
  document.getElementById("team-name").textContent = lineup.teamName;
  document.getElementById("team-subtitle").textContent = lineup.subtitle;
  document.getElementById("footer-text").textContent = lineup.footer;
  document.getElementById("formation-display").textContent =
    lineup.formation.split("-").join(" - ");

  const flag = document.getElementById("team-flag");
  flag.innerHTML = "";
  if (lineup.flagImage) {
    const img = document.createElement("img");
    img.src = lineup.flagImage;
    img.alt = lineup.teamName + " flag";
    flag.appendChild(img);
  } else {
    flag.textContent = lineup.flag;
  }
}

// Photo circle with the player's picture, or their initials
function createPhoto(player) {
  const photo = document.createElement("div");
  photo.className = "player-photo";
  if (player.image) {
    const img = document.createElement("img");
    img.src = player.image;
    img.alt = player.name;
    photo.appendChild(img);
  } else {
    photo.textContent = getInitials(player);
  }
  return photo;
}

// Display all players
function displayPlayers() {
  playerContainer.innerHTML = "";

  lineup.players.forEach(function (player) {
    const playerCard = document.createElement("div");
    playerCard.className = "player";
    playerCard.style.left = player.x + "%";
    playerCard.style.top = player.y + "%";

    const photo = createPhoto(player);

    const number = document.createElement("div");
    number.className = "player-number";
    number.textContent = player.number;

    const name = document.createElement("div");
    name.className = "player-name";
    name.textContent = player.name;

    playerCard.append(photo, number, name);
    makeDraggable(playerCard, player);
    playerContainer.appendChild(playerCard);
  });
}

// Display the substitutes bench under the pitch
function displayBench() {
  const bench = document.getElementById("bench");
  const benchList = document.getElementById("bench-list");
  benchList.innerHTML = "";
  bench.hidden = lineup.subs.length === 0;

  lineup.subs.forEach(function (sub) {
    const subCard = document.createElement("div");
    subCard.className = "sub";

    const number = document.createElement("span");
    number.className = "sub-number";
    number.textContent = sub.number;

    const name = document.createElement("span");
    name.className = "sub-name";
    name.textContent = sub.name;

    subCard.append(createPhoto(sub), number, name);
    benchList.appendChild(subCard);
  });
}

function updateAll() {
  displayHeader();
  displayPlayers();
  displayBench();
  saveLineup();
}

// ---------- Dragging players on the pitch ----------

function makeDraggable(card, player) {
  card.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    card.setPointerCapture(event.pointerId);
    card.classList.add("dragging");

    function move(e) {
      const rect = pitch.getBoundingClientRect();
      player.x = Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 3, 97) * 10) / 10;
      player.y = Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 4, 96) * 10) / 10;
      card.style.left = player.x + "%";
      card.style.top = player.y + "%";
    }

    function stop() {
      card.classList.remove("dragging");
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", stop);
      card.removeEventListener("pointercancel", stop);
      saveLineup();
    }

    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", stop);
    card.addEventListener("pointercancel", stop);
  });
}

// ---------- Editor ----------

function fillEditor() {
  teamNameInput.value = lineup.teamName;
  subtitleInput.value = lineup.subtitle;
  footerInput.value = lineup.footer;
  flagInput.value = lineup.flag;
  formationSelect.value = lineup.formation;
  buildAllInputs();
}

function buildAllInputs() {
  buildPlayerInputs();
  buildSubInputs();
}

// One row per player: role, number, name, photo
function buildPlayerInputs() {
  playerInputs.innerHTML = "";
  const roles = getRoles(lineup.formation);

  lineup.players.forEach(function (player, index) {
    playerInputs.appendChild(createPlayerRow(player, roles[index]));
  });
}

// Editor row for one player (used for starters and substitutes)
function createPlayerRow(player, roleText) {
  const row = document.createElement("div");
  row.className = "player-row";

  const role = document.createElement("span");
  role.className = "role";
  role.textContent = roleText;

  const numberInput = document.createElement("input");
  numberInput.type = "number";
  numberInput.min = 1;
  numberInput.max = 99;
  numberInput.value = player.number;
  numberInput.className = "number-input";
  numberInput.setAttribute("aria-label", "Shirt number");
  numberInput.addEventListener("input", function () {
    player.number = numberInput.value;
    updateAll();
  });

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 22;
  nameInput.value = player.name;
  nameInput.setAttribute("aria-label", "Player name");
  nameInput.addEventListener("input", function () {
    player.name = nameInput.value;
    updateAll();
  });

  const photoLabel = document.createElement("label");
  photoLabel.className = "file-button";
  photoLabel.textContent = player.image ? "Change" : "Photo";
  const photoInput = document.createElement("input");
  photoInput.type = "file";
  photoInput.accept = "image/*";
  photoInput.addEventListener("change", function () {
    if (!photoInput.files[0]) return;
    readImage(photoInput.files[0], function (dataUrl) {
      player.image = dataUrl;
      updateAll();
      buildAllInputs();
    });
  });
  photoLabel.appendChild(photoInput);

  row.append(role, numberInput, nameInput, photoLabel);

  if (player.image) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "small-button";
    removeButton.textContent = "✕";
    removeButton.title = "Remove photo";
    removeButton.addEventListener("click", function () {
      delete player.image;
      updateAll();
      buildAllInputs();
    });
    row.appendChild(removeButton);
  }

  return row;
}

// ---------- Substitutes ----------

function buildSubInputs() {
  subInputs.innerHTML = "";

  lineup.subs.forEach(function (sub, index) {
    const row = createPlayerRow(sub, "SUB");
    row.classList.add("sub-row");

    // Pick a starter to swap with this substitute
    const swapSelect = document.createElement("select");
    swapSelect.className = "swap-select";
    swapSelect.setAttribute("aria-label", "Swap with a starter");
    fillSwapOptions(swapSelect);
    // Refresh the list in case starter names changed
    swapSelect.addEventListener("focus", function () {
      fillSwapOptions(swapSelect);
    });
    swapSelect.addEventListener("change", function () {
      if (swapSelect.value === "") return;
      substitute(index, Number(swapSelect.value));
    });

    const removeSubButton = document.createElement("button");
    removeSubButton.type = "button";
    removeSubButton.className = "small-button";
    removeSubButton.textContent = "Remove";
    removeSubButton.addEventListener("click", function () {
      lineup.subs.splice(index, 1);
      updateAll();
      buildSubInputs();
    });

    row.append(swapSelect, removeSubButton);
    subInputs.appendChild(row);
  });

  addSubButton.disabled = lineup.subs.length >= MAX_SUBS;
}

function fillSwapOptions(select) {
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "⇄ Swap…";
  select.appendChild(placeholder);

  lineup.players.forEach(function (player, index) {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = "#" + player.number + " " + player.name;
    select.appendChild(option);
  });
}

// Bring a substitute on: they swap places with the starter.
// The new player takes the starter's spot on the pitch.
function substitute(subIndex, playerIndex) {
  const sub = lineup.subs[subIndex];
  const starter = lineup.players[playerIndex];

  ["name", "number", "image"].forEach(function (key) {
    const temp = starter[key];
    starter[key] = sub[key];
    sub[key] = temp;
  });

  if (!starter.image) delete starter.image;
  if (!sub.image) delete sub.image;

  updateAll();
  buildAllInputs();
}

addSubButton.addEventListener("click", function () {
  if (lineup.subs.length >= MAX_SUBS) return;

  // Use the lowest shirt number that isn't taken yet
  const usedNumbers = lineup.players.concat(lineup.subs).map(function (player) {
    return Number(player.number);
  });
  let number = 12;
  while (usedNumbers.includes(number)) number++;

  lineup.subs.push({ name: "Substitute " + (lineup.subs.length + 1), number: number });
  updateAll();
  buildSubInputs();
});

// Formation dropdown options
Object.keys(formations).forEach(function (name) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  formationSelect.appendChild(option);
});

teamNameInput.addEventListener("input", function () {
  lineup.teamName = teamNameInput.value.toUpperCase();
  updateAll();
});

subtitleInput.addEventListener("input", function () {
  lineup.subtitle = subtitleInput.value.toUpperCase();
  updateAll();
});

footerInput.addEventListener("input", function () {
  lineup.footer = footerInput.value.toUpperCase();
  updateAll();
});

flagInput.addEventListener("input", function () {
  lineup.flag = flagInput.value;
  updateAll();
});

flagImageInput.addEventListener("change", function () {
  if (!flagImageInput.files[0]) return;
  readImage(flagImageInput.files[0], function (dataUrl) {
    lineup.flagImage = dataUrl;
    flagImageInput.value = "";
    updateAll();
  });
});

document.getElementById("flag-image-remove").addEventListener("click", function () {
  lineup.flagImage = null;
  updateAll();
});

formationSelect.addEventListener("change", function () {
  lineup.formation = formationSelect.value;
  placePlayers(lineup);
  updateAll();
  buildPlayerInputs();
});

document.getElementById("reset-positions-btn").addEventListener("click", function () {
  placePlayers(lineup);
  updateAll();
});

document.getElementById("reset-all-btn").addEventListener("click", function () {
  if (!confirm("Reset the whole lineup back to the default?")) return;
  lineup = copyDefaultLineup();
  fillEditor();
  updateAll();
});

// ---------- Download as PNG ----------

document.getElementById("download-btn").addEventListener("click", function () {
  if (typeof html2canvas === "undefined") {
    alert("The image library could not load. Check your internet connection and try again.");
    return;
  }

  const button = this;
  button.disabled = true;
  button.textContent = "Creating image...";

  html2canvas(document.getElementById("broadcast"), {
    scale: 2,
    backgroundColor: null,
  })
    .then(function (canvas) {
      const link = document.createElement("a");
      const fileName = (lineup.teamName || "lineup").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = fileName + "-lineup.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch(function (error) {
      console.error(error);
      alert(
        "Sorry, the image could not be created.\n\n" +
          "If you opened index.html directly from your folder, the browser blocks " +
          "saving images that use files from your computer (like the team logo). " +
          "Open the page with VS Code's Live Server extension instead and try again."
      );
    })
    .finally(function () {
      button.disabled = false;
      button.textContent = "Download PNG";
    });
});

// Run everything
fillEditor();
updateAll();

console.log("11 players loaded successfully!");
