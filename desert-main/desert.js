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
const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const playBtn = document.getElementById("playBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

// ===== Audio Manager =====
const audio = {
    bgm: new Audio("../Music/Music/Desert Theme (Level 3).ogg"),
    jump: new Audio("../soundfx/soundfx/Male Jump (Jump SFX).wav"),
    land: new Audio("../soundfx/soundfx/Falling in Sand (Level 3 when i fall in sand after jumping).wav"),
    startFX: new Audio("../soundfx/soundfx/Sand FX Desert (plays when you enter the desert realm level 3).wav"),
    win: new Audio("../soundfx/soundfx/Whoosh2 (this plays after you complete any round with the transition).wav"),
    die: new Audio("../soundfx/soundfx/Whoosh3 (this plays when you die in any round).wav"),
    collect: new Audio("../soundfx/soundfx/Click (when i touch the mask at the end of the round).wav")
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.4;
Object.values(audio).forEach(s => { if(s !== audio.bgm) s.volume = 0.4; });

// ===== Assets =====
const bg = new Image(); bg.src = "background/brown.jpg";
const charImg = new Image(); charImg.src = "character.svg";
const maskImg = new Image(); maskImg.src = "../red-main/mask.svg";
const block1 = new Image(); block1.src = "block1.svg"; 
const block2 = new Image(); block2.src = "block2.svg"; 
const block3 = new Image(); block3.src = "block3.svg";

// ===== Game Constants =====
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 1200;
const GRAVITY = 0.9;
const FRICTION = 0.82;
const SPEED = 6;
const JUMP_FORCE = 22; // Easier jumps

// ===== State =====
let gameActive = false;
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
    direction: "right" // ADDED: Required for flip logic
};

// ===== Platforms (World Coordinates) =====
const platforms = [
    // Starting Area
    { x: 0, y: WORLD_HEIGHT - 50, w: 800, h: 50, img: block3 },
    
    // Trek Phase 1
    { x: 900, y: WORLD_HEIGHT - 200, w: 167, h: 30, img: block2 },
    { x: 1200, y: WORLD_HEIGHT - 300, w: 103, h: 30, img: block1 },
    { x: 1400, y: WORLD_HEIGHT - 300, w: 103, h: 30, img: block1 },
    
    // Moving Platform 1
    { x: 1600, y: WORLD_HEIGHT - 400, w: 167, h: 30, img: block2, dx: 2, range: 200, baseX: 1600 },
    
    // High Dunes
    { x: 2000, y: WORLD_HEIGHT - 500, w: 266, h: 30, img: block3 },
    { x: 2400, y: WORLD_HEIGHT - 600, w: 167, h: 30, img: block2 },
    
    // Moving Platform 2
    { x: 2700, y: WORLD_HEIGHT - 700, w: 103, h: 30, img: block1, dx: -2.5, range: 150, baseX: 2700 },
    
    // Final Ascent
    { x: 3000, y: WORLD_HEIGHT - 800, w: 266, h: 30, img: block3 },
    { x: 3400, y: WORLD_HEIGHT - 950, w: 103, h: 30, img: block1 },
    { x: 3600, y: WORLD_HEIGHT - 1100, w: 266, h: 30, img: block3 } // Goal
];

// ===== Mask =====
const mask = {
    x: 3700,
    y: WORLD_HEIGHT - 1150,
    w: 40,
    h: 40,
    taken: false
};

// ===== Particles (Sandstorm) =====
class Particle {
    constructor() {
        this.reset();
        this.x = Math.random() * WORLD_WIDTH;
        this.y = Math.random() * WORLD_HEIGHT;
    }

    reset() {
        this.x = Math.random() * WORLD_WIDTH; // Spawn anywhere horizontally
        this.y = Math.random() * WORLD_HEIGHT;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 5 + 3;
        this.color = `rgba(255, 200, 100, ${Math.random() * 0.5 + 0.1})`;
    }

    update() {
        this.x -= this.speed; // Move left
        this.y += Math.sin(frames * 0.05 + this.x) * 1.0;
        if (this.x < 0) this.x = WORLD_WIDTH; // Wrap around world
    }

    draw() {
        if (this.x >= camera.x && this.x <= camera.x + camera.width &&
            this.y >= camera.y && this.y <= camera.y + camera.height) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - camera.x, this.y - camera.y, this.size, this.size);
        }
    }
}
const particles = Array.from({ length: 300 }, () => new Particle());


// ===== Input =====
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (player.locked) player.locked = false;
});
window.addEventListener("keyup", e => keys[e.code] = false);

// ===== Helpers =====
function hit(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

function resetPlayer() {
    audio.die.play();
    player.x = startX;
    player.y = startY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.locked = true;
    mask.taken = false;
    
    endScreen.querySelector("h1").textContent = "LOST IN THE SAND";
    endScreen.classList.remove("hidden");
    gameActive = false;
    
    // Setup retry logic
    const newBtn = nextLevelBtn.cloneNode(true);
    nextLevelBtn.parentNode.replaceChild(newBtn, nextLevelBtn);
    newBtn.textContent = "RETRY";
    newBtn.onclick = () => {
        endScreen.classList.add("hidden");
        gameActive = true;
        update();
    };
}

// ===== Start (Auto) =====
function startGame() {
    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameActive = true;
    update();
    
    // Try auto-play audio
    const playAudio = () => {
        audio.bgm.play().catch(() => {});
        audio.startFX.play().catch(() => {});
        window.removeEventListener('click', playAudio);
        window.removeEventListener('keydown', playAudio);
    };
    playAudio();
    window.addEventListener('click', playAudio);
    window.addEventListener('keydown', playAudio);
}

startGame();

// ===== Game Loop =====
function update() {
    if (!gameActive) return;
    frames++;

    camera.width = canvas.width;
    camera.height = canvas.height;
    camera.follow(player);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Background
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // 2. Particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Overlay
    ctx.fillStyle = "rgba(60, 40, 10, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Physics
    if (!player.locked) {
        // FIXED: Added direction updates here
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
        }

        if (keys["ArrowUp"] && player.grounded) {
            player.vy = -JUMP_FORCE;
            player.grounded = false;
            audio.jump.currentTime = 0;
            audio.jump.play();
        }

        if (!player.grounded) player.vy += GRAVITY;
    }
    
    // Store previous grounded state to detect landing
    const wasGrounded = player.grounded;
    player.grounded = false;

    // 4. Platforms
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
            if (player.y + player.h - player.vy <= p.y + 10) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.grounded = true;
                
                // Landing Sound (only once)
                if (!wasGrounded && player.vy > 1) { 
                   // Simple landing check
                }
            }
        }
    });

    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;
    if (player.y > WORLD_HEIGHT + 100) resetPlayer();

    // 5. Player Draw - FIXED FLIP LOGIC
    ctx.save();
    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;
    const charDrawWidth = 80;
    const charDrawHeight = 52;

    // Logic: If direction is "left", flip. Else (right/default) draw normal.
    if (player.direction === "right") {
        ctx.translate(drawX + charDrawWidth, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(charImg, 0, 0, charDrawWidth, charDrawHeight);
    } else {
        ctx.drawImage(charImg, drawX, drawY, charDrawWidth, charDrawHeight);
    }
    ctx.restore();

    // 6. Mask
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

            document.body.classList.add("slide-out");
            setTimeout(() => {
                window.location.href = "../red-main/red.html";
            }, 800);
        }
    }

    // Vignette
    const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)"); // Desert heat vignette
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(update);
}