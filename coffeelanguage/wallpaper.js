import { randomColorGroup } from "./main.js";

const fadeContainer = document.getElementById("fade");
if (fadeContainer) {
    document.addEventListener("DOMContentLoaded", () => {
        fadeContainer.style.opacity = 0;
    });
}

const canvas = document.getElementById("canvas");
const canvasBlur = document.getElementById("canvas-blur");

if (!canvas || !canvasBlur) {
    throw new Error("Wallpaper canvas elements not found.");
}

const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
const blurContext = canvasBlur.getContext("2d", { alpha: true, desynchronized: true });

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const hardwareThreads = navigator.hardwareConcurrency || 8;
const memoryGb = navigator.deviceMemory || 8;
const lowPerfMode = prefersReducedMotion || isCoarsePointer || hardwareThreads <= 4 || memoryGb <= 4;

document.documentElement.classList.toggle("low-perf", lowPerfMode);

let width = 0;
let height = 0;
let dpr = 1;
let animationFrameId = 0;
let particles = [];
let isPaused = false;
let lastFrameTime = 0;
let lastPermutationTick = 0;

let permutation = [];
let pTable = new Array(512);

function generateRandomPermutation() {
    const array = [];
    for (let i = 0; i < 256; i++) {
        array.push(i);
    }

    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function rebuildPermutationTable() {
    permutation = generateRandomPermutation();
    for (let i = 0; i < 256; i++) {
        pTable[i] = pTable[i + 256] = permutation[i];
    }
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function mix(a, b, t) {
    return (1 - t) * a + t * b;
}

function dot2D(hash, x, y) {
    switch (hash & 15) {
        case 0:
            return x + y;
        case 1:
            return -x + y;
        case 2:
            return x - y;
        case 3:
            return -x - y;
        case 4:
            return x;
        case 5:
            return -x;
        case 6:
            return y;
        case 7:
            return -y;
        default:
            return 0;
    }
}

function perlin(x, y) {
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    const X = floorX & 255;
    const Y = floorY & 255;

    const gi00 = pTable[X + pTable[Y]];
    const gi01 = pTable[X + pTable[Y + 1]];
    const gi10 = pTable[X + 1 + pTable[Y]];
    const gi11 = pTable[X + 1 + pTable[Y + 1]];

    const n00 = dot2D(gi00, x, y);
    const n10 = dot2D(gi10, x - 1, y);
    const n01 = dot2D(gi01, x, y - 1);
    const n11 = dot2D(gi11, x - 1, y - 1);

    const u = fade(x - floorX);
    const v = fade(y - floorY);
    const nx0 = mix(n00, n10, u);
    const nx1 = mix(n01, n11, u);
    return mix(nx0, nx1, v);
}

function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

function randomColorRgb() {
    const c1 = hexToRgb(randomColorGroup.primary);
    const c2 = hexToRgb(randomColorGroup.secondary);
    const factor = Math.random();

    return {
        r: Math.floor((1 - factor) * c1.r + factor * c2.r),
        g: Math.floor((1 - factor) * c1.g + factor * c2.g),
        b: Math.floor((1 - factor) * c1.b + factor * c2.b)
    };
}

function computeParticleCount(area) {
    const small = Math.round(area / (lowPerfMode ? 12000 : 4500));
    const big = Math.round(area / (lowPerfMode ? 95000 : 36000));
    const maxSmall = lowPerfMode ? 110 : 320;
    const maxBig = lowPerfMode ? 20 : 65;

    return {
        small: Math.min(small, maxSmall),
        big: Math.min(big, maxBig)
    };
}

function createParticles() {
    const createdParticles = [];
    const area = window.innerWidth * window.innerHeight;
    const counts = computeParticleCount(area);

    for (let i = 0; i < counts.small; i++) {
        createdParticles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * (lowPerfMode ? 5 : 9) + 1,
            rgb: randomColorRgb(),
            pdx: 0,
            pdy: 0
        });
    }

    for (let i = 0; i < counts.big; i++) {
        createdParticles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * (lowPerfMode ? 8 : 18) + (lowPerfMode ? 10 : 16),
            rgb: randomColorRgb(),
            pdx: 0,
            pdy: 0
        });
    }

    return createdParticles;
}

function particleColor(particle) {
    if (lowPerfMode) {
        return `rgba(${particle.rgb.r}, ${particle.rgb.g}, ${particle.rgb.b}, 0.35)`;
    }

    const maxDistance = Math.hypot(width / 2, height / 2);
    const distance = Math.hypot(particle.x - width / 2, particle.y - height / 2);
    const darkness = Math.max(0.1, 1 - distance / maxDistance);
    const alpha = Math.min(0.7, 0.2 + darkness * 0.55);

    const r = Math.round(particle.rgb.r * darkness);
    const g = Math.round(particle.rgb.g * darkness);
    const b = Math.round(particle.rgb.b * darkness);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateParticles() {
    const noiseScale = lowPerfMode ? 0.003 : 0.005;
    const speed = lowPerfMode ? 0.07 : 0.1;
    const easingFactor = lowPerfMode ? 0.025 : 0.015;
    const margin = 150 * dpr;

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const noiseX = perlin(particle.x * noiseScale, particle.y * noiseScale) - 0.5;
        const noiseY = perlin(particle.y * noiseScale, particle.x * noiseScale) - 0.5;

        const dx = particle.pdx + ((noiseX * speed) / (particle.radius / 5) - particle.pdx) * easingFactor;
        const dy = particle.pdy + ((noiseY * speed) / (particle.radius / 5) - particle.pdy) * easingFactor;

        particle.pdx = dx;
        particle.pdy = dy;
        particle.x += dx;
        particle.y += dy;

        if (particle.x <= -margin || particle.x >= width + margin) {
            particle.x = width - particle.x;
            particle.pdx *= -0.25;
        }
        if (particle.y <= -margin || particle.y >= height + margin) {
            particle.y = height - particle.y;
            particle.pdy *= -0.25;
        }
    }
}

function renderParticles() {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particleColor(particle);
        context.fill();
    }

    if (!lowPerfMode) {
        blurContext.clearRect(0, 0, width, height);
        blurContext.drawImage(canvas, 0, 0);
    }
}

function loop(now) {
    if (isPaused) {
        animationFrameId = requestAnimationFrame(loop);
        return;
    }

    const targetFrameMs = lowPerfMode ? 33 : 16;
    if (now - lastFrameTime < targetFrameMs) {
        animationFrameId = requestAnimationFrame(loop);
        return;
    }
    lastFrameTime = now;

    if (now - lastPermutationTick > 1000) {
        rebuildPermutationTable();
        lastPermutationTick = now;
    }

    updateParticles();
    renderParticles();
    animationFrameId = requestAnimationFrame(loop);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = 0;
}

function setCanvasSize() {
    dpr = Math.min(window.devicePixelRatio || 1, lowPerfMode ? 1 : 1.5);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    width = Math.max(1, Math.floor(viewportWidth * dpr));
    height = Math.max(1, Math.floor(viewportHeight * dpr));

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    canvasBlur.width = width;
    canvasBlur.height = height;
    canvasBlur.style.width = `${viewportWidth}px`;
    canvasBlur.style.height = `${viewportHeight}px`;

    if (lowPerfMode) {
        canvasBlur.style.display = "none";
    } else {
        canvasBlur.style.display = "block";
    }
}

function init() {
    stopAnimation();
    setCanvasSize();
    rebuildPermutationTable();
    particles = createParticles();
    lastFrameTime = 0;
    lastPermutationTick = 0;
    animationFrameId = requestAnimationFrame(loop);
}

let restartTimeout = 0;
function restart() {
    window.clearTimeout(restartTimeout);
    restartTimeout = window.setTimeout(() => {
        init();
    }, 120);
}

document.addEventListener("colorChange", restart);

document.addEventListener("visibilitychange", () => {
    isPaused = document.hidden;
});

window.addEventListener("resize", restart);

init();