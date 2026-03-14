document.addEventListener("DOMContentLoaded", () => {
    const tiltElements = document.querySelectorAll(".tilt-element");
    if (!tiltElements.length || window.matchMedia("(pointer: coarse)").matches) {
        return;
    }

    let pointerX = 0;
    let pointerY = 0;
    let rafId = 0;

    function applyTilt() {
        for (let i = 0; i < tiltElements.length; i++) {
            const tiltElement = tiltElements[i];
            const rect = tiltElement.getBoundingClientRect();
            const x = pointerX - (rect.left + rect.width / 2);
            const y = pointerY - (rect.top + rect.height / 2);
            const distance = Math.hypot(x, y);
            const tiltAmount = Math.pow(distance, 1.5) / 2000000;
            tiltElement.style.transform = `rotateY(${x * tiltAmount}deg) rotateX(${-y * tiltAmount}deg)`;
        }

        rafId = 0;
    }

    document.addEventListener("mousemove", (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (!rafId) {
            rafId = requestAnimationFrame(applyTilt);
        }
    });
});