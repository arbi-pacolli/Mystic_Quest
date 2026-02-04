// ===== Configuration & Setup =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// UI Elements
const playBtnEnd = document.getElementById("playBtnEnd");

// ===== Audio Manager =====
const audio = {
    bgm: new Audio("../Music/Music/Spooky Dungeon (Level 4).mp3"),
    jump: new Audio("../soundfx/soundfx/Male Jump (Jump SFX).wav"),
    ambient: new Audio("../soundfx/soundfx/Campfire Crackles (Level 4).wav"),
    win: new Audio("../soundfx/soundfx/Fire swoosh (Level 4 plays when you die in level 4 only and when you complete level 4).wav"),
    die: new Audio("../soundfx/soundfx/Fire swoosh (Level 4 plays when you die in level 4 only and when you complete level 4).wav"),
    collect: new Audio("../soundfx/soundfx/Click (when i touch the mask at the end of the round).wav")
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.4;
audio.ambient.loop = true;
audio.ambient.volume = 0.3;
Object.values(audio).forEach(s => { if(s !== audio.bgm && s !== audio.ambient) s.volume = 0.4; });
if (localStorage.getItem("audioEnabled") === "false") {
    Object.values(audio).forEach(s => s.muted = true);
}

// ===== Assets =====
const bg = new Image(); bg.src = "red.jpg";
const charImg = new Image(); charImg.src = "character.svg";
const maskImg = new Image(); maskImg.src = "mask.svg";
const block2 = new Image(); block2.src = "block2.svg";
const block3 = new Image(); block3.src = "block3.svg";

// ===== Game Constants =====
const WORLD_WIDTH = 1500;
const WORLD_HEIGHT = 3000;
const GRAVITY = 1.5;
const FRICTION = 0.85;
const SPEED = 6;
document.body.style.transform = "translateX(-100vw)";const JUMP_FORCE = 35; // HARD MODE

// ===== State =====
let gameActive = false;
let isPaused = false;
let lives = parseInt(localStorage.getItem("lives")) || 3;
let frames = 0;
const keys = {};

// ===== Camera =====
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    follow: function(target) {
        this.x = target.x - this.width / 2;
        this.y = target.y - this.height / 2;
        this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - this.height));
    }
};

// ===== Player =====
const startX = 100;
const startY = WORLD_HEIGHT - 150;

const player = {
    x: startX,
    y: startY,
    w: 80,
    h: 52,
    vx: 0,
    vy: 0,
    grounded: true,
    locked: true,
    direction: "right" // ADDED: Need this for direction check
};

// ===== Platforms (World Coordinates) =====
const platforms = [
    { x: 0, y: WORLD_HEIGHT - 50, w: 600, h: 50, img: block2 },
    { x: 600, y: WORLD_HEIGHT - 200, w: 140, h: 20, img: block3 },
    { x: 900, y: WORLD_HEIGHT - 350, w: 120, h: 20, img: block2 },
    { x: 1200, y: WORLD_HEIGHT - 500, w: 140, h: 20, img: block3 },
    { x: 800, y: WORLD_HEIGHT - 650, w: 120, h: 20, img: block2, dx: 3, range: 200, baseX: 800 }, // Faster moving
    { x: 400, y: WORLD_HEIGHT - 800, w: 140, h: 20, img: block3 },
    { x: 100, y: WORLD_HEIGHT - 950, w: 120, h: 20, img: block2 },
    { x: 300, y: WORLD_HEIGHT - 1100, w: 120, h: 20, img: block2, dx: -3, range: 150, baseX: 300 }, // Faster
    { x: 600, y: WORLD_HEIGHT - 1250, w: 140, h: 20, img: block3 },
    { x: 900, y: WORLD_HEIGHT - 1400, w: 120, h: 20, img: block2 },
    { x: 1200, y: WORLD_HEIGHT - 1550, w: 140, h: 20, img: block3 },
    { x: 1000, y: WORLD_HEIGHT - 1700, w: 120, h: 20, img: block2, dx: 4, range: 250, baseX: 1000 }, // Very Fast
    { x: 700, y: WORLD_HEIGHT - 1850, w: 140, h: 20, img: block3 },
    { x: 400, y: WORLD_HEIGHT - 2000, w: 120, h: 20, img: block2 },
    { x: 100, y: WORLD_HEIGHT - 2150, w: 140, h: 20, img: block3 },
    { x: 400, y: WORLD_HEIGHT - 2300, w: 120, h: 20, img: block2 } 
];

// ===== Mask =====
const mask = {
    x: 440,
    y: WORLD_HEIGHT - 2350,
    w: 40,
    h: 40,
    taken: false
};

// ===== Particles (Embers) =====
class Particle {
    constructor() {
        this.reset();
        this.y = Math.random() * WORLD_HEIGHT;
    }
    reset() {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = WORLD_HEIGHT + 10;
        this.size = Math.random() * 4 + 1;
        this.speedY = Math.random() * 2 + 1;
        this.color = `rgba(255, ${Math.random() * 100}, 0, ${Math.random() * 0.6 + 0.2})`;
    }
    update() {
        this.y -= this.speedY;
        this.x += Math.sin(frames * 0.05 + this.y * 0.01) * 0.5;
        if (this.y < camera.y - 10) this.reset();
    }
    draw() {
        if (this.x >= camera.x && this.x <= camera.x + camera.width &&
            this.y >= camera.y && this.y <= camera.y + camera.height) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.size, this.size);
        }
    }
}
const particles = Array.from({ length: 150 }, () => new Particle());

// ===== Input =====
window.addEventListener("keydown", e => {
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
    keys[e.code] = true;
    if (player.locked) player.locked = false;
    console.log("player.locked:", player.locked);
});
window.addEventListener("keyup", e => keys[e.code] = false);

// ===== Helpers =====
function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resetPlayer() {
    try { audio.die.play().catch(()=>{}); } catch(e){}
    lives--;
    localStorage.setItem("lives", lives);

    player.x = startX;
    player.y = startY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.locked = true;
    mask.taken = false;

    if (lives <= 0) {
        endScreen.querySelector("h1").textContent = "GAME OVER";
        if(playBtnEnd) playBtnEnd.textContent = "MAIN MENU";
    } else {
        endScreen.querySelector("h1").textContent = "BURNED ALIVE";
        if(playBtnEnd) playBtnEnd.textContent = "RETRY";
    }
    endScreen.classList.remove("hidden");
    gameActive = false;
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    if (isPaused) {
        audio.bgm.pause();
        
        // DOM Overlay for Pause Menu
        const overlay = document.createElement("div");
        overlay.id = "pause-overlay";
        Object.assign(overlay.style, {
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            backgroundColor: "rgba(30, 0, 0, 0.7)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: "1000"
        });
        
        const box = document.createElement("div");
        Object.assign(box.style, {
            width: "320px", padding: "20px", backgroundColor: "#2f0a0a",
            border: "4px solid #FF5722", textAlign: "center", color: "#FFAB91",
            fontFamily: "Arial, sans-serif", boxShadow: "0 0 20px rgba(0,0,0,0.5)"
        });
        
        const title = document.createElement("h2");
        title.textContent = "PAUSED";
        title.style.margin = "0 0 20px 0";
        title.style.fontSize = "36px";
        
        const createBtn = (text, onClick) => {
            const btn = document.createElement("button");
            btn.textContent = text;
            Object.assign(btn.style, {
                display: "block", width: "100%", padding: "10px", margin: "10px 0",
                backgroundColor: "transparent", border: "2px solid #FF5722",
                color: "#FFAB91", fontSize: "18px", cursor: "pointer", fontWeight: "bold"
            });
            btn.onclick = onClick;
            return btn;
        };

        box.appendChild(title);
        box.appendChild(createBtn("RESUME", togglePause));
        box.appendChild(createBtn("REPLAY LEVEL", () => location.reload()));
        box.appendChild(createBtn("MAIN MENU", () => window.location.href = "../Home Screen/index.html"));
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    } else {
        audio.bgm.play().catch(() => {});
        const overlay = document.getElementById("pause-overlay");
        if(overlay) overlay.remove();
        update();
    }
}

// ===== Start =====
function startGame() {
    document.body.style.transform = "translateX(0)";
    document.body.style.opacity = "1";
    endScreen.classList.add("hidden");
    gameActive = true;
    update();
    const playAudio = () => {
        audio.bgm.play().catch(() => {});
        audio.ambient.play().catch(() => {});
        window.removeEventListener('click', playAudio);
        window.removeEventListener('keydown', playAudio);
    };
    playAudio();
    window.addEventListener('click', playAudio);
    window.addEventListener('keydown', playAudio);
}
startGame();

if(playBtnEnd) playBtnEnd.onclick = () => {
    if (lives <= 0) {
        window.location.href = "../Home Screen/index.html";
        return;
    }
    endScreen.classList.add("hidden");
    audio.bgm.currentTime = 0;
    player.x = startX;
    player.y = startY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.locked = true;
    mask.taken = false;
    gameActive = true;
    update();
    audio.bgm.play().catch(() => {});
};

var start = 0;
// ===== Update =====
function update() {
    //if (!gameActive) return;
    if (isPaused) return;
    frames++;
    camera.width = canvas.width;
    camera.height = canvas.height;
    camera.follow(player);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Draw Lives
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText("❤️ x " + lives, 20, 40);
    ctx.restore();

    particles.forEach(p => { p.update(); p.draw(); });
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Physics
    if (!player.locked) {
        if (keys["ArrowRight"]) {
            player.vx = SPEED;
            player.direction = "right"; // Set direction
        }
        else if (keys["ArrowLeft"]) {
            player.vx = -SPEED;
            player.direction = "left"; // Set direction
        }
        else {
            player.vx *= FRICTION;
            if (Math.abs(player.vx) < 0.1) player.vx = 0;
        }

        if (keys["ArrowUp"] && player.grounded) {
            player.vy = -JUMP_FORCE;
            player.grounded = false;
            try { audio.jump.currentTime = 0; audio.jump.play().catch(()=>{}); } catch(e){}
        }
        
        if (!player.grounded) player.vy += GRAVITY;
    }
    
    player.x += player.vx;
    player.y += player.vy;
    player.grounded = false;

    // Platforms
    platforms.forEach(p => {
        if (p.dx) {
            p.x += p.dx;
            if (Math.abs(p.x - p.baseX) > p.range) p.dx *= -1;
        }
        if (p.x + p.w > camera.x && p.x < camera.x + camera.width &&
            p.y + p.h > camera.y && p.y < camera.y + camera.height) {
            ctx.drawImage(p.img, p.x - camera.x, p.y - camera.y, p.w, p.h);
        }
        if (hit(player, p)) {
            if (player.vy > 0 && player.y - player.vy + player.h <= p.y + 10) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.grounded = true;
            }
        }
    });
    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;
    if (player.y > WORLD_HEIGHT + 100) resetPlayer();

    // Player (Robust Draw) - FIXED FLIP LOGIC
    ctx.save();
    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;
    const charDrawWidth = 80;
    const charDrawHeight = 52;

    // FIX: Swapped logic. "Left" now causes the flip. "Right" (else) draws normal.
    if (player.direction === "right") {
        ctx.translate(drawX + charDrawWidth, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(charImg, 0, 0, charDrawWidth, charDrawHeight);
    } else {
        ctx.drawImage(charImg, drawX, drawY, charDrawWidth, charDrawHeight);
    }
    ctx.restore();

    // Mask
    if (!mask.taken) {
        const floatY = mask.y + Math.sin(frames * 0.05) * 5;
        if (mask.x + mask.w > camera.x && mask.x < camera.x + camera.width &&
            floatY + mask.h > camera.y && floatY < camera.y + camera.height) {
            ctx.drawImage(maskImg, mask.x - camera.x, floatY - camera.y, mask.w, mask.h);
        }
        if (hit(player, { x: mask.x, y: floatY, w: mask.w, h: mask.h })) {
            mask.taken = true;
            gameActive = false;
            try {
                audio.collect.play();
                audio.win.play();
                audio.bgm.pause();
                audio.ambient.pause();
            } catch(e){}
            document.body.style.transition = "opacity 1s ease";
            document.body.style.opacity = "0";
            setTimeout(() => {
                window.location.href = "../Victory/victory/victory.html";
            }, 1000);
        }
    }

    // Vignette
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)"); // Darker for Dungeon
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(update);
}