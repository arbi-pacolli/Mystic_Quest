const masks = document.querySelectorAll('.mask');
const title = document.querySelector('.title');
const subtitle = document.querySelector('.subtitle');
const icons = document.querySelectorAll('.element-icons .icon');

// Animate text first
setTimeout(() => { title.classList.add('text-visible'); }, 500);
setTimeout(() => { subtitle.classList.add('text-visible'); }, 1000);

// Reveal masks one by one
masks.forEach((mask, index) => {
  setTimeout(() => { mask.classList.add('visible'); }, 1500 + index * 800);
});

// Animate elemental icons
// After fade-in animation ends, mark as collected
icons.forEach(icon => {
  icon.addEventListener('animationend', () => {
    icon.classList.add('collected');
  });
});

/* =========================
   ELEMENTAL PARTICLE BACKGROUND
   ========================= */
const canvas = document.getElementById('background');
const ctx = canvas.getContext('2d');
let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const colors = ['#1E90FF', '#32CD32', '#FFD700', '#FF4500']; // Water, Nature, Desert, Fire
const particles = [];

for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedX: (Math.random() - 0.5) * 0.5,
    speedY: (Math.random() - 0.5) * 0.5,
    alpha: Math.random() * 0.5 + 0.3
  });
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hexToRgb(p.color)},${p.alpha})`;
    ctx.fill();
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  });
  requestAnimationFrame(animate);
}
animate();

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
}

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});
