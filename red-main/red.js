// ===== Configuration & Setup ===== 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Rregullo madhësinë e canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// UI Elements
const endScreen = document.getElementById("end-screen");

// ===== Audio Manager (me path të thjeshtë) ===== 
const audio = {
    bgm: new Audio("https://assets.mixkit.co/music/preview/mixkit-game-show-suspense-waiting-667.mp3"),
    jump: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-player-jumping-in-a-video-game-2043.mp3"),
    win: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3"),
    die: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-explosion-game-over-1990.mp3"),
    collect: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3")
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.3;
Object.values(audio).forEach(s => {
    if(s !== audio.bgm) s.volume = 0.5;
});

// ===== Assets ===== 
const bg = new Image(); bg.src = "background.jpg";
const charImg = new Image(); charImg.src = "character.svg";
const maskImg = new Image(); maskImg.src = "mask.svg";
const block1 = new Image(); block1.src = "block1.svg";
const block2 = new Image(); block2.src = "block2.svg";

// ===== Game Constants ===== 
const WORLD_WIDTH = 1500;
const WORLD_HEIGHT = 2000;
const GRAVITY = 1.2;
const FRICTION = 0.85;
const SPEED = 7;
const JUMP_FORCE = 25;

// ===== State ===== 
let gameActive = true;
let isPaused = false;
let lives = 3;
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
    grounded: false,
    direction: "right"
};

// ===== Platforms (më pak) ===== 
const platforms = [
    { x: 0, y: WORLD_HEIGHT - 50, w: 600, h: 20, img: block2 },
    { x: 600, y: WORLD_HEIGHT - 200, w: 140, h: 20, img: block1 },
    { x: 900, y: WORLD_HEIGHT - 350, w: 120, h: 20, img: block1 },
    { x: 1200, y: WORLD_HEIGHT - 500, w: 140, h: 20, img: block2 },
    { x: 800, y: WORLD_HEIGHT - 650, w: 120, h: 20, dx: 3, range: 200, baseX: 800, img: block1 },
    { x: 400, y: WORLD_HEIGHT - 800, w: 140, h: 20, img: block2 },
    { x: 100, y: WORLD_HEIGHT - 950, w: 120, h: 20, img: block1 },
    { x: 600, y: WORLD_HEIGHT - 1250, w: 140, h: 20, img: block2 },
    { x: 900, y: WORLD_HEIGHT - 1400, w: 120, h: 20, img: block1 },
    { x: 1200, y: WORLD_HEIGHT - 1550, w: 140, h: 20, img: block2 },
    { x: 400, y: WORLD_HEIGHT - 2000, w: 120, h: 20, img: block1 }
];

// ===== Mask ===== 
const mask = {
    x: 400,
    y: WORLD_HEIGHT - 2100,
    w: 40,
    h: 40,
    taken: false
};

// ===== Helpers ===== 
function hit(a, b) {
    return a.x < b.x + b.w && 
           a.x + a.w > b.x && 
           a.y < b.y + b.h && 
           a.y + a.h > b.y;
}

function resetPlayer() {
    audio.die.play().catch(() => {});
    lives--;
    
    player.x = startX;
    player.y = startY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    mask.taken = false;
    
    if (lives <= 0) {
        gameActive = false;
        if (endScreen) {
            endScreen.querySelector("h1").textContent = "GAME OVER";
            endScreen.querySelector("h2").textContent = "NO LIVES LEFT";
            endScreen.classList.remove("hidden");
        }
    }
}

// ===== Input ===== 
window.addEventListener("keydown", e => {
    if (e.code === "KeyP" || e.code === "Escape") {
        isPaused = !isPaused;
        if (!isPaused) requestAnimationFrame(update);
    }
    keys[e.code] = true;
});

window.addEventListener("keyup", e => keys[e.code] = false);

// ===== Game Start ===== 
function startGame() {
    gameActive = true;
    
    // Start audio
    audio.bgm.play().catch(() => {});
    
    // Start game loop
    update();
}

// Start game when page loads
window.addEventListener("load", startGame);

// ===== Update Game Loop ===== 
function update() {
    if (!gameActive || isPaused) return;
    
    frames++;
    
    // Update camera
    camera.width = canvas.width;
    camera.height = canvas.height;
    camera.follow(player);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (with fallback)
    ctx.fillStyle = "#2b0000"; // Dark red fallback
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (bg.complete && bg.naturalWidth !== 0) {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw Lives
    ctx.fillStyle = "#FF4444";
    ctx.font = "bold 24px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(`❤️ ${lives}`, 20, 40);
    
    // Draw frames counter (debug)
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(`FPS: ${Math.round(frames/10)}`, canvas.width - 100, 30);
    
    // Physics
    if (keys["ArrowRight"]) {
        player.vx = SPEED;
        player.direction = "right";
    } else if (keys["ArrowLeft"]) {
        player.vx = -SPEED;
        player.direction = "left";
    } else {
        player.vx *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }
    
    if (keys["ArrowUp"] && player.grounded) {
        player.vy = -JUMP_FORCE;
        player.grounded = false;
        audio.jump.play().catch(() => {});
    }
    
    if (!player.grounded) player.vy += GRAVITY;
    
    // Apply velocity
    player.x += player.vx;
    player.y += player.vy;
    
    // Reset grounded state
    player.grounded = false;
    
    // Platform collision and drawing
    platforms.forEach(p => {
        // Update moving platforms
        if (p.dx) {
            p.x += p.dx;
            if (Math.abs(p.x - p.baseX) > p.range) p.dx *= -1;
        }
        
        // Draw platform
        const platformX = p.x - camera.x;
        const platformY = p.y - camera.y;
        
        if (platformX + p.w > 0 && platformX < canvas.width &&
            platformY + p.h > 0 && platformY < canvas.height) {
            
            // Draw platform with shadow
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 3;
            
            if (p.img && p.img.complete) {
                ctx.drawImage(p.img, platformX, platformY, p.w, p.h);
            } else {
                // Fallback platform drawing
                ctx.fillStyle = "#8B4513";
                ctx.fillRect(platformX, platformY, p.w, p.h);
                ctx.fillStyle = "#A52C0A";
                ctx.fillRect(platformX, platformY + 5, p.w, p.h - 5);
            }
            
            // Reset shadow
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Check collision
        if (hit(player, p)) {
            if (player.vy > 0 && player.y - player.vy + player.h <= p.y + 5) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.grounded = true;
            }
        }
    });
    
    // World boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > WORLD_WIDTH - player.w) player.x = WORLD_WIDTH - player.w;
    
    // Check if player fell
    if (player.y > WORLD_HEIGHT + 100) {
        resetPlayer();
    }
    
    // Draw Player
    const playerX = player.x - camera.x;
    const playerY = player.y - camera.y;
    
    if (charImg.complete) {
        ctx.save();
        
        if (player.direction === "left") {
            // Flip horizontally when facing left
            ctx.translate(playerX + player.w / 2, playerY + player.h / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(charImg, -player.w / 2, -player.h / 2, player.w, player.h);
        } else {
            // Normal when facing right
            ctx.drawImage(charImg, playerX, playerY, player.w, player.h);
        }
        
        ctx.restore();
    } else {
        // Fallback player rectangle with direction indicator
        ctx.fillStyle = "#44FF44";
        ctx.fillRect(playerX, playerY, player.w, player.h);
        
        // Eyes to show direction
        ctx.fillStyle = "#333";
        if (player.direction === "left") {
            ctx.fillRect(playerX + 10, playerY + 15, 10, 10);
            ctx.fillRect(playerX + 30, playerY + 15, 10, 10);
        } else {
            ctx.fillRect(playerX + 40, playerY + 15, 10, 10);
            ctx.fillRect(playerX + 60, playerY + 15, 10, 10);
        }
    }
    
    // Draw Mask if not taken
    if (!mask.taken) {
        const maskX = mask.x - camera.x;
        const maskY = mask.y - camera.y + Math.sin(frames * 0.05) * 10;
        
        if (maskX + mask.w > 0 && maskX < canvas.width &&
            maskY + mask.h > 0 && maskY < canvas.height) {
            
            // Glow effect
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 15;
            
            if (maskImg.complete) {
                ctx.drawImage(maskImg, maskX, maskY, mask.w, mask.h);
            } else {
                ctx.fillStyle = "#FFD700";
                ctx.beginPath();
                ctx.arc(maskX + mask.w/2, maskY + mask.h/2, mask.w/2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = "#FFA500";
                ctx.beginPath();
                ctx.arc(maskX + mask.w/2, maskY + mask.h/2, mask.w/3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0;
        }
        
        // Check mask collection
        if (hit(player, { x: mask.x, y: mask.y, w: mask.w, h: mask.h })) {
            mask.taken = true;
            
            audio.collect.play();
            audio.win.play();
            audio.bgm.pause();
            
            document.body.style.transition = "transform 0.8s ease-in-out";
            document.body.style.transform = "translateX(-100vw)";
            setTimeout(() => {
                window.location.href = "../Victory/victory/victory.html";
            }, 800);
        }
    }
    
    // Draw fire particles (embers)
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height - Math.random() * 100;
        const size = Math.random() * 3 + 1;
        
        ctx.fillStyle = `rgba(255, ${Math.random() * 100}, 0, 0.8)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Dark vignette effect
    const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height/4,
        canvas.width/2, canvas.height/2, canvas.height/2
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw instructions
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Use ARROW KEYS to move • Press P to pause", canvas.width/2, canvas.height - 20);
    
    // Continue game loop
    requestAnimationFrame(update);
}

// Handle replay button
if (endScreen) {
    const replayBtn = endScreen.querySelector("button");
    if (replayBtn) {
        replayBtn.onclick = function() {
            location.reload();
        };
    }
}