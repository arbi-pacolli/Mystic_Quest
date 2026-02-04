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

// ===== Audio Manager =====
const audio = {
    bgm: new Audio(encodeURI("../Music/Music/The Outer Forest (Level 1).mp3")),
    jump: new Audio(encodeURI("../soundfx/soundfx/Male Jump (Jump SFX).wav")),
    land: new Audio(encodeURI("../soundfx/soundfx/Walking on grass (level 1 when walking it plays but not too loud).wav")),
    win: new Audio(encodeURI("../soundfx/soundfx/Whoosh2 (this plays after you complete any round with the transition).wav")),
    die: new Audio(encodeURI("../soundfx/soundfx/Whoosh3 (this plays when you die in any round).wav")),
    collect: new Audio(encodeURI("../soundfx/soundfx/Click (when i touch the mask at the end of the round).wav"))
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.4;
Object.values(audio).forEach(s => { if(s !== audio.bgm) s.volume = 0.4; });
if (localStorage.getItem("audioEnabled") === "false") {
    Object.values(audio).forEach(s => s.muted = true);
}

// ===== Assets =====
const bg = new Image(); bg.src = "background.jpg";
const charImg = new Image(); charImg.src = "character.svg";
const maskImg = new Image(); maskImg.src = "mask.svg";
const block1 = new Image(); block1.src = "platform1.svg";
const block2 = new Image(); block2.src = "platform2.svg";

// ===== Game Constants =====
const WORLD_WIDTH = 3000;
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
    { x: 0, y: WORLD_HEIGHT - 50, w: 800, h: 50, img: block2 },
    { x: 900, y: WORLD_HEIGHT - 200, w: 167, h: 30, img: block1 },
    { x: 1200, y: WORLD_HEIGHT - 350, w: 167, h: 30, img: block1 },
    { x: 1500, y: WORLD_HEIGHT - 500, w: 167, h: 30, img: block2 },
    { x: 1200, y: WORLD_HEIGHT - 650, w: 167, h: 30, img: block1 },
    { x: 800, y: WORLD_HEIGHT - 800, w: 167, h: 30, img: block2 },
    { x: 400, y: WORLD_HEIGHT - 950, w: 167, h: 30, img: block1, dx: 2, range: 200, baseX: 400 },
    { x: 800, y: WORLD_HEIGHT - 1100, w: 167, h: 30, img: block2 },
    { x: 1200, y: WORLD_HEIGHT - 1250, w: 167, h: 30, img: block1 },
    { x: 1600, y: WORLD_HEIGHT - 1400, w: 167, h: 30, img: block2 },
    { x: 2000, y: WORLD_HEIGHT - 1550, w: 167, h: 30, img: block1 },
    { x: 2400, y: WORLD_HEIGHT - 1700, w: 167, h: 30, img: block2 },
    { x: 2700, y: WORLD_HEIGHT - 1800, w: 300, h: 30, img: block1 } // Goal
];

// ===== Mask =====
const mask = {
    x: 2850,
    y: WORLD_HEIGHT - 1850,
    w: 40,
    h: 40,
    taken: false
};

// ===== Particles (Leaves) =====
class Particle {
    constructor() {
        this.reset();
        this.y = Math.random() * WORLD_HEIGHT;
    }
    reset() {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = -10;
        this.size = Math.random() * 6 + 3;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.color = Math.random() > 0.5 ? "rgba(76, 175, 80, 0.8)" : "rgba(255, 165, 0, 0.8)";
    }
    update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(frames * 0.02 + this.y * 0.01) * 0.5;
        if (this.y > WORLD_HEIGHT) this.reset();
    }
    draw() {
        if (this.x >= camera.x && this.x <= camera.x + camera.width &&
            this.y >= camera.y && this.y <= camera.y + camera.height) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x - camera.x, this.y - camera.y, this.size, this.size/2, Math.PI/4, 0, Math.PI*2);
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
        endScreen.querySelector("h1").textContent = "LOST IN THE WOODS";
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
            backgroundColor: "rgba(0, 20, 0, 0.7)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: "1000"
        });
        
        const box = document.createElement("div");
        Object.assign(box.style, {
            width: "320px", padding: "20px", backgroundColor: "#1a2f1a",
            border: "4px solid #4CAF50", textAlign: "center", color: "#81C784",
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
                backgroundColor: "transparent", border: "2px solid #4CAF50",
                color: "#81C784", fontSize: "18px", cursor: "pointer", fontWeight: "bold"
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
        if (keys["ArrowRight"]) { player.vx = SPEED; player.direction = "right"; }
        else if (keys["ArrowLeft"]) { player.vx = -SPEED; player.direction = "left"; }
        else { player.vx *= FRICTION; if (Math.abs(player.vx) < 0.1) player.vx = 0; }

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
                
                // Land Sound
                if (player.vy > 1) {
                     try { audio.land.currentTime = 0; audio.land.play().catch(()=>{}); } catch(e){}
                }
            }
        }
    });

    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;
    if (player.y > WORLD_HEIGHT + 100) resetPlayer();

    // Player
    ctx.save();
    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;
    const charDrawWidth = 80;
    const charDrawHeight = 52;
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
            } catch(e){}
            document.body.style.transition = "transform 0.8s ease-in-out";
            document.body.style.transform = "translateX(-100vw)";
            setTimeout(() => { window.location.href = "../blue-main/blue.html"; }, 800);
        }
    }

    // Vignette
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,50,0,0.4)"); // Greenish vignette
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(update);
}
