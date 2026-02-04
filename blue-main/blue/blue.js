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
const endScreen = document.getElementById("end-screen");
const playBtnEnd = document.getElementById("playBtnEnd");

// ===== Audio Manager (USING SAFE DESERT AUDIO) =====
const audio = {
    bgm: new Audio("../Music/Music/Desert Theme (Level 3).ogg"),
    jump: new Audio("../soundfx/soundfx/Male Jump (Jump SFX).wav"),
    win: new Audio("../soundfx/soundfx/Whoosh2 (this plays after you complete any round with the transition).wav"),
    die: new Audio("../soundfx/soundfx/Whoosh3 (this plays when you die in any round).wav"),
    collect: new Audio("../soundfx/soundfx/Click (when i touch the mask at the end of the round).wav")
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.4;
Object.values(audio).forEach(s => { if(s !== audio.bgm) s.volume = 0.4; });
if (localStorage.getItem("audioEnabled") === "false") {
    Object.values(audio).forEach(s => s.muted = true);
}

// ===== Assets =====
const bg = new Image(); bg.src = "blue.jpg";

// SAFE CHARACTER (Desert)
const charImg = new Image(); 
charImg.src = "characterblue.svg"; 

// SAFE MASK (Desert)
const maskImg = new Image(); 
maskImg.src = "../nature-main/mask.svg";

// Blocks (Blue)
const blockA = new Image(); blockA.src = "block4.svg";
const blockB = new Image(); blockB.src = "block5.svg";

// ===== Game Constants =====
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const GRAVITY = 1.5;
const FRICTION = 0.85;
const SPEED = 6;
const JUMP_FORCE = 35; 

// ===== State =====
let gameActive = false;
let isPaused = false;
let lives = parseInt(localStorage.getItem("lives")) || 3;
let frames = 0;
const keys = {};

// ===== Camera =====
const camera = {
    x: 0, y: 0, width: canvas.width, height: canvas.height,
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
    direction: "right"
};

// ===== Platforms =====
const platforms = [
    { x: 0, y: WORLD_HEIGHT - 50, w: 600, h: 50, img: blockA },
    { x: 600, y: WORLD_HEIGHT - 200, w: 220, h: 24, img: blockB },
    { x: 900, y: WORLD_HEIGHT - 350, w: 220, h: 24, img: blockA },
    { x: 600, y: WORLD_HEIGHT - 500, w: 200, h: 24, img: blockB, dx: 1.5, range: 100, baseX: 600 },
    { x: 300, y: WORLD_HEIGHT - 650, w: 220, h: 24, img: blockA },
    { x: 50, y: WORLD_HEIGHT - 800, w: 220, h: 24, img: blockB },
    { x: 400, y: WORLD_HEIGHT - 950, w: 180, h: 24, img: blockA, dx: 2, range: 200, baseX: 400 },
    { x: 800, y: WORLD_HEIGHT - 1100, w: 220, h: 24, img: blockB },
    { x: 1200, y: WORLD_HEIGHT - 1250, w: 220, h: 24, img: blockA },
    { x: 1500, y: WORLD_HEIGHT - 1400, w: 200, h: 24, img: blockB },
    { x: 1800, y: WORLD_HEIGHT - 1600, w: 150, h: 24, img: blockA, dx: -1.5, range: 100, baseX: 1800 },
    { x: 1500, y: WORLD_HEIGHT - 1800, w: 300, h: 24, img: blockB } // Goal
];

// ===== Mask =====
const mask = {
    x: 1650,
    y: WORLD_HEIGHT - 1850,
    w: 40,
    h: 40,
    taken: false
};

// ===== Particles (Bubbles) =====
class Particle {
    constructor() {
        this.reset();
        this.y = Math.random() * WORLD_HEIGHT;
    }
    reset() {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = WORLD_HEIGHT + 10;
        this.size = Math.random() * 5 + 2;
        this.speedY = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.y -= this.speedY;
        this.x += Math.sin(frames * 0.02 + this.y * 0.01) * 0.5;
        if (this.y < camera.y - 10) this.reset();
    }
    draw() {
        if (this.x >= camera.x && this.x <= camera.x + camera.width &&
            this.y >= camera.y && this.y <= camera.y + camera.height) {
            ctx.fillStyle = `rgba(150, 220, 255, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
const particles = Array.from({ length: 150 }, () => new Particle());

// ===== Input =====
window.addEventListener("keydown", e => {
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
    keys[e.code] = true;
    if (player.locked) player.locked = false;
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
        endScreen.querySelector("h1").textContent = "YOU DIED";
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
            backgroundColor: "rgba(0, 10, 40, 0.7)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: "1000"
        });
        
        const box = document.createElement("div");
        Object.assign(box.style, {
            width: "320px", padding: "20px", backgroundColor: "#0D47A1",
            border: "4px solid #4FC3F7", textAlign: "center", color: "#E1F5FE",
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
                backgroundColor: "transparent", border: "2px solid #4FC3F7",
                color: "#E1F5FE", fontSize: "18px", cursor: "pointer", fontWeight: "bold"
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

// ===== Update =====
function update() {
    if (!gameActive) return;
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

    // Physics
    if (!player.locked) {
        // --- FIXED SECTION: Replaced player.speed/friction with SPEED/FRICTION ---
        if (keys["ArrowRight"]) { 
            player.vx = SPEED; 
            player.direction = "right"; 
        }
        else if (keys["ArrowLeft"]) { 
            player.vx = -SPEED; 
            player.direction = "left"; 
        }
        else { 
            player.vx *= FRICTION; 
            if (Math.abs(player.vx) < 0.1) player.vx = 0;
        }
        // -------------------------------------------------------------------------

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

    // Player (Robust Draw)
    ctx.save();
    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;
    const charDrawWidth = 80;
    const charDrawHeight = 52;
    if (player.direction === "left") {
        ctx.drawImage(charImg, drawX, drawY, charDrawWidth, charDrawHeight);
    } else {
        ctx.translate(drawX + charDrawWidth, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(charImg, 0, 0, charDrawWidth, charDrawHeight);
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
            } catch(e){}
            document.body.style.transition = "transform 0.8s ease-in-out";
            document.body.style.transform = "translateX(-100vw)";
            setTimeout(() => { window.location.href = "../desert-main/desert.html"; }, 800);
        }
    }

    // Vignette
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(update);
}