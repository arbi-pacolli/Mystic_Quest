// ===== Configuration & Setup ===== 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Resize canvas to fit window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// UI Elements
const endScreen = document.getElementById("end-screen");

// ===== Audio Manager ===== 
const audio = {
    bgm: new Audio("https://assets.mixkit.co/music/preview/mixkit-game-show-suspense-waiting-667.mp3"),
    jump: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-player-jumping-in-a-video-game-2043.mp3"),
    win: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3"),
    die: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-explosion-game-over-1990.mp3"),
    collect: new Audio("https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3")
};

// Audio Settings
audio.bgm.loop = true;
audio.bgm.volume = 0.4;
Object.values(audio).forEach(s => {
    if(s !== audio.bgm) s.volume = 0.5;
});

// ===== Assets ===== 
const bg = new Image(); 
bg.src = "red.jpg";

const charImg = new Image(); 
charImg.src = "character.svg";

const maskImg = new Image(); 
maskImg.src = "mask.svg";

const block1 = new Image(); 
block1.src = "block1.svg";

const block2 = new Image(); 
block2.src = "block2.svg";

// Debug character image loading
charImg.onload = () => {
    console.log("Character image loaded successfully!");
};

charImg.onerror = () => {
    console.error("Failed to load character image! Using fallback.");
};

bg.onload = () => {
    console.log("Background image loaded successfully!");
};

// ===== Game Constants - More challenging ===== 
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 2500;
const GRAVITY = 1.4;
const FRICTION = 0.88;
const SPEED = 6.5;
const JUMP_FORCE = 26;

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

// ===== Player - Starts at LEFT side ===== 
const startX = 80;
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

// ===== Platforms - HARDER: Small platforms, big gaps, moving platforms, disappearing platforms ===== 
const platforms = [
    // Ground level
    { x: 0, y: WORLD_HEIGHT - 50, w: 400, h: 20, img: block2 },
    
    // Section 1 - Small platforms with big gaps
    { x: 500, y: WORLD_HEIGHT - 200, w: 70, h: 20, img: block1 },
    { x: 700, y: WORLD_HEIGHT - 280, w: 70, h: 20, img: block1 },
    { x: 900, y: WORLD_HEIGHT - 360, w: 70, h: 20, img: block1 },
    { x: 1100, y: WORLD_HEIGHT - 440, w: 70, h: 20, img: block1 },
    
    // Section 2 - Moving platforms (horizontal)
    { x: 1300, y: WORLD_HEIGHT - 520, w: 80, h: 20, dx: 3.5, range: 200, baseX: 1300, img: block1 },
    { x: 1650, y: WORLD_HEIGHT - 600, w: 80, h: 20, dx: -4, range: 220, baseX: 1650, img: block1 },
    
    // Section 3 - Narrow platforms
    { x: 2000, y: WORLD_HEIGHT - 700, w: 60, h: 20, img: block2 },
    { x: 2150, y: WORLD_HEIGHT - 780, w: 60, h: 20, img: block2 },
    { x: 2300, y: WORLD_HEIGHT - 860, w: 60, h: 20, img: block2 },
    { x: 2450, y: WORLD_HEIGHT - 940, w: 60, h: 20, img: block2 },
    
    // Section 4 - Moving platforms (vertical movement)
    { x: 2700, y: WORLD_HEIGHT - 1050, w: 90, h: 20, dy: 2.5, rangeY: 150, baseY: WORLD_HEIGHT - 1050, img: block1 },
    { x: 2950, y: WORLD_HEIGHT - 1150, w: 90, h: 20, dy: -3, rangeY: 180, baseY: WORLD_HEIGHT - 1150, img: block1 },
    
    // Section 5 - Disappearing platforms (stay for short time)
    { x: 3300, y: WORLD_HEIGHT - 1300, w: 80, h: 20, img: block1, disappearTimer: 0, lifespan: 45, reappearDelay: 0, reappearCooldown: 0 },
    { x: 3500, y: WORLD_HEIGHT - 1380, w: 80, h: 20, img: block1, disappearTimer: 0, lifespan: 45, reappearDelay: 0, reappearCooldown: 0 },
    { x: 3700, y: WORLD_HEIGHT - 1460, w: 80, h: 20, img: block1, disappearTimer: 0, lifespan: 45, reappearDelay: 0, reappearCooldown: 0 },
    
    // Section 6 - Very narrow platforms with large gaps
    { x: 4000, y: WORLD_HEIGHT - 1600, w: 50, h: 20, img: block2 },
    { x: 4150, y: WORLD_HEIGHT - 1700, w: 50, h: 20, img: block2 },
    { x: 4300, y: WORLD_HEIGHT - 1800, w: 50, h: 20, img: block2 },
    { x: 4450, y: WORLD_HEIGHT - 1900, w: 50, h: 20, img: block2 },
    
    // Section 7 - Moving platforms (fast)
    { x: 4700, y: WORLD_HEIGHT - 2050, w: 100, h: 20, dx: 5, range: 250, baseX: 4700, img: block1 },
    
    // Final platforms to mask
    { x: 4850, y: WORLD_HEIGHT - 2200, w: 120, h: 20, img: block2 }
];

// Add vertical movement to platforms
platforms.forEach(p => {
    if (p.dy) {
        p.y = p.baseY;
    }
});

// ===== Mask - At the very end ===== 
const mask = {
    x: 4820,
    y: WORLD_HEIGHT - 2300,
    w: 40,
    h: 40,
    taken: false
};

// ===== Pause Menu ===== 
function showPauseMenu() {
    isPaused = true;
    audio.bgm.pause();
    
    const overlay = document.createElement("div");
    overlay.id = "pause-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    const menuBox = document.createElement("div");
    menuBox.style.cssText = `
        background: linear-gradient(135deg, #2c1a0f, #1a0f08);
        border: 3px solid #ff4444;
        border-radius: 20px;
        padding: 40px 50px;
        text-align: center;
        box-shadow: 0 0 50px rgba(255, 68, 68, 0.3);
        animation: slideUp 0.3s ease;
    `;
    
    const title = document.createElement("h2");
    title.textContent = "PAUSED";
    title.style.cssText = `
        color: #ff4444;
        font-size: 48px;
        margin: 0 0 30px 0;
        font-family: Arial, sans-serif;
        text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
    `;
    
    const buttonStyle = `
        display: block;
        width: 250px;
        padding: 12px 20px;
        margin: 15px 0;
        background: linear-gradient(135deg, #ff4444, #cc0000);
        border: none;
        border-radius: 50px;
        color: white;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        font-family: Arial, sans-serif;
    `;
    
    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "▶ RESUME";
    resumeBtn.style.cssText = buttonStyle;
    resumeBtn.onmouseover = () => {
        resumeBtn.style.transform = "scale(1.05)";
        resumeBtn.style.boxShadow = "0 0 20px rgba(255, 68, 68, 0.8)";
    };
    resumeBtn.onmouseout = () => {
        resumeBtn.style.transform = "scale(1)";
        resumeBtn.style.boxShadow = "none";
    };
    resumeBtn.onclick = () => {
        document.body.removeChild(overlay);
        isPaused = false;
        audio.bgm.play().catch(() => {});
        update();
    };
    
    const replayBtn = document.createElement("button");
    replayBtn.textContent = "🔄 REPLAY LEVEL";
    replayBtn.style.cssText = buttonStyle;
    replayBtn.onmouseover = () => {
        replayBtn.style.transform = "scale(1.05)";
        replayBtn.style.boxShadow = "0 0 20px rgba(255, 68, 68, 0.8)";
    };
    replayBtn.onmouseout = () => {
        replayBtn.style.transform = "scale(1)";
        replayBtn.style.boxShadow = "none";
    };
    replayBtn.onclick = () => {
        location.reload();
    };
    
    const menuBtn = document.createElement("button");
    menuBtn.textContent = "🏠 MAIN MENU";
    menuBtn.style.cssText = buttonStyle;
    menuBtn.onmouseover = () => {
        menuBtn.style.transform = "scale(1.05)";
        menuBtn.style.boxShadow = "0 0 20px rgba(255, 68, 68, 0.8)";
    };
    menuBtn.onmouseout = () => {
        menuBtn.style.transform = "scale(1)";
        menuBtn.style.boxShadow = "none";
    };
    menuBtn.onclick = () => {
        window.location.href = "../Home Screen/index.html";
    };
    
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    menuBox.appendChild(title);
    menuBox.appendChild(resumeBtn);
    menuBox.appendChild(replayBtn);
    menuBox.appendChild(menuBtn);
    overlay.appendChild(menuBox);
    document.body.appendChild(overlay);
}

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
    
    // Reset disappearing platforms
    platforms.forEach(p => {
        if (p.disappearTimer !== undefined) {
            p.disappearTimer = 0;
            p.reappearCooldown = 0;
        }
        if (p.dy) {
            p.y = p.baseY;
        }
        if (p.dx) {
            p.x = p.baseX;
        }
    });
    
    if (lives <= 0) {
        gameActive = false;
        audio.bgm.pause();
        
        setTimeout(() => {
            window.location.href = "../Home Screen/index.html";
        }, 1500);
    }
}

// ===== Input ===== 
window.addEventListener("keydown", e => {
    if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        if (!gameActive) return;
        if (!isPaused) {
            showPauseMenu();
        }
    }
    keys[e.code] = true;
});

window.addEventListener("keyup", e => keys[e.code] = false);

// ===== Game Start ===== 
function startGame() {
    gameActive = true;
    audio.bgm.play().catch(() => {});
    update();
}

window.addEventListener("load", startGame);

// ===== Update Game Loop ===== 
function update() {
    if (!gameActive || isPaused) return;
    
    frames++;
    
    camera.width = canvas.width;
    camera.height = canvas.height;
    camera.follow(player);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (bg.complete && bg.naturalWidth !== 0) {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#8B0000");
        gradient.addColorStop(1, "#2b0000");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw Lives - Format: ❤️x3
    ctx.fillStyle = "#FF4444";
    ctx.font = "bold 28px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(`❤️x${lives}`, 20, 50);
    ctx.shadowBlur = 0;
    
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
        audio.jump.currentTime = 0;
        audio.jump.play().catch(() => {});
    }
    
    if (!player.grounded) player.vy += GRAVITY;
    
    // Apply velocity
    player.x += player.vx;
    player.y += player.vy;
    
    // Reset grounded state
    player.grounded = false;
    
    // Update moving platforms
    platforms.forEach(p => {
        // Horizontal movement
        if (p.dx) {
            p.x += p.dx;
            if (Math.abs(p.x - p.baseX) > p.range) p.dx *= -1;
        }
        
        // Vertical movement
        if (p.dy) {
            p.y += p.dy;
            if (Math.abs(p.y - p.baseY) > p.rangeY) p.dy *= -1;
        }
        
        // Disappearing platform logic
        if (p.disappearTimer !== undefined) {
            if (p.reappearCooldown > 0) {
                p.reappearCooldown--;
            } else if (p.disappearTimer > 0) {
                p.disappearTimer--;
            } else if (player.grounded && hit(player, p)) {
                p.disappearTimer = p.lifespan;
                p.reappearCooldown = 30; // Wait before reappearing
            }
        }
    });
    
    // Platform collision and drawing
    platforms.forEach(p => {
        // Only draw if not disappeared
        const isVisible = (p.disappearTimer === undefined || p.disappearTimer === 0 || p.reappearCooldown > 0);
        
        if (isVisible) {
            const platformX = p.x - camera.x;
            const platformY = p.y - camera.y;
            
            if (platformX + p.w > 0 && platformX < canvas.width &&
                platformY + p.h > 0 && platformY < canvas.height) {
                
                if (p.img && p.img.complete) {
                    ctx.drawImage(p.img, platformX, platformY, p.w, p.h);
                } else {
                    ctx.fillStyle = "#8B4513";
                    ctx.fillRect(platformX, platformY, p.w, p.h);
                    ctx.fillStyle = "#A52C0A";
                    ctx.fillRect(platformX, platformY + 5, p.w, 5);
                }
            }
        }
        
        // Check collision only if platform is visible
        if (isVisible && hit(player, p)) {
            if (player.vy > 0 && player.y - player.vy + player.h <= p.y + 10) {
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
    
    // Draw Player - NO GLOW
    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;
    const charDrawWidth = 80;
    const charDrawHeight = 52;
    
    ctx.save();
    // NO shadow/blur/glow - removed completely
    
    if (charImg.complete && charImg.naturalWidth !== 0) {
        if (player.direction === "right") {
            ctx.translate(drawX + charDrawWidth, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(charImg, 0, 0, charDrawWidth, charDrawHeight);
        } else {
            ctx.drawImage(charImg, drawX, drawY, charDrawWidth, charDrawHeight);
        }
    } else {
        // Fallback character - simple red square
        ctx.fillStyle = "#FF4444";
        ctx.fillRect(drawX, drawY, charDrawWidth, charDrawHeight);
        
        // Simple eyes
        ctx.fillStyle = "#FFFFFF";
        if (player.direction === "right") {
            ctx.fillRect(drawX + 50, drawY + 15, 10, 10);
            ctx.fillRect(drawX + 20, drawY + 15, 10, 10);
            ctx.fillStyle = "#000000";
            ctx.fillRect(drawX + 52, drawY + 18, 6, 6);
            ctx.fillRect(drawX + 22, drawY + 18, 6, 6);
        } else {
            ctx.fillRect(drawX + 50, drawY + 15, 10, 10);
            ctx.fillRect(drawX + 20, drawY + 15, 10, 10);
            ctx.fillStyle = "#000000";
            ctx.fillRect(drawX + 52, drawY + 18, 6, 6);
            ctx.fillRect(drawX + 22, drawY + 18, 6, 6);
        }
        
        // Simple mouth
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.ellipse(drawX + charDrawWidth/2, drawY + 38, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    // Draw Mask
    if (!mask.taken) {
        const maskX = mask.x - camera.x;
        const maskY = mask.y - camera.y + Math.sin(frames * 0.05) * 8;
        
        if (maskX + mask.w > 0 && maskX < canvas.width &&
            maskY + mask.h > 0 && maskY < canvas.height) {
            ctx.fillStyle = "#FFD700";
            ctx.beginPath();
            ctx.arc(maskX + mask.w/2, maskY + mask.h/2, mask.w/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#FFA500";
            ctx.beginPath();
            ctx.arc(maskX + mask.w/2, maskY + mask.h/2, mask.w/3, 0, Math.PI * 2);
            ctx.fill();
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
    
    // Simple fire particles for atmosphere
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height - Math.random() * 150;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = `rgba(255, ${Math.random() * 100 + 50}, 0, 0.4)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Soft vignette effect
    const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height/4,
        canvas.width/2, canvas.height/2, canvas.height/1.3
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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