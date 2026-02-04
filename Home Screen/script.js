

// ==============================
// DOM ELEMENTS
// ==============================
const startBtn = document.getElementById("startBtn");
const howToPlayBtn = document.getElementById("howToPlayBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const instructionsPanel = document.getElementById("instructionsPanel");
const closeSettings = document.getElementById("closeSettings");
const closeInstructions = document.getElementById("closeInstructions");

const audioOnBtn = document.getElementById("audioOn");
const audioOffBtn = document.getElementById("audioOff");

// ==============================
// STATE
// ==============================
let audioEnabled = true;

// ==============================
// EVENTS
// ==============================
startBtn.addEventListener("click", () => {
    showNotification("Starting game...");
    setTimeout(() => {
        window.location.href = "../nature-main/nature.html";
    }, 1000);
});

howToPlayBtn.addEventListener("click", () => {
    instructionsPanel.style.display = "block";
    settingsPanel.style.display = "none";
    highlightMovementControls();
});

settingsBtn.addEventListener("click", () => {
    settingsPanel.style.display = "block";
    instructionsPanel.style.display = "none";
});

closeSettings.addEventListener("click", () => {
    settingsPanel.style.display = "none";
});

closeInstructions.addEventListener("click", () => {
    instructionsPanel.style.display = "none";
});

// ==============================
// AUDIO TOGGLE
// ==============================
audioOnBtn.addEventListener("click", () => {
    if (!audioEnabled) {
        audioEnabled = true;
        updateAudioButtons();
        showNotification("Audio Enabled");
    }
});

audioOffBtn.addEventListener("click", () => {
    if (audioEnabled) {
        audioEnabled = false;
        updateAudioButtons();
        showNotification("Audio Disabled");
    }
});

function updateAudioButtons() {
    audioOnBtn.classList.toggle("active", audioEnabled);
    audioOffBtn.classList.toggle("active", !audioEnabled);
}

// ==============================
// INSTRUCTION HIGHLIGHT
// ==============================
function highlightMovementControls() {
    const instructions = document.querySelectorAll(".instruction");

    instructions.forEach(item => {
        item.style.background = "transparent";
        item.style.borderRadius = "0";
        item.style.padding = "0";
    });

    for (let i = 0; i < 3 && i < instructions.length; i++) {
        instructions[i].style.background = "rgba(255, 165, 0, 0.15)";
        instructions[i].style.borderRadius = "12px";
        instructions[i].style.padding = "15px";
        instructions[i].style.transition = "background 0.4s ease";
    }
}

// ==============================
// NOTIFICATION SYSTEM
// ==============================
function showNotification(message) {
    const existing = document.querySelector(".notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;

    // Minimal inline styling so it ALWAYS shows
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.padding = "14px 22px";
    notification.style.borderRadius = "10px";
    notification.style.background =
        "linear-gradient(135deg, #ff9f1c, #ff4d00)";
    notification.style.color = "#fff";
    notification.style.fontWeight = "600";
    notification.style.zIndex = "9999";
    notification.style.boxShadow = "0 10px 25px rgba(0,0,0,0.4)";

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2200);
}

// ==============================
// INIT
// ==============================
updateAudioButtons();
