/**
 * SafeVote Premium Background Animation
 * Dynamic Neural Nodes & Floating Glass Orbs
 */

class PremiumAnimation {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -100, y: -100, radius: 250 };
        this.theme = 'light';

        this.init();
    }

    init() {
        this.canvas.id = 'bg-animation-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = '1';
        document.body.prepend(this.canvas);

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        this.resize();
        this.animate();

        // Observe theme changes
        const observer = new MutationObserver(() => this.updateTheme());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        this.updateTheme();
    }

    updateTheme() {
        const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
        if (this.theme !== newTheme) {
            this.theme = newTheme;
            this.createParticles(); // Re-create with new colors
        }
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.createParticles();
    }

    getRandomColor() {
        const colors = {
            light: ['#2563eb', '#3b82f6', '#60a5fa', '#0ea5e9'],
            dark: ['#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd'],
            'eye-protection': ['#b45309', '#d97706', '#f59e0b', '#8b5e3c']
        };
        const palette = colors[this.theme] || colors.light;
        return palette[Math.floor(Math.random() * palette.length)];
    }

    createParticles() {
        this.particles = [];
        const count = Math.min(70, Math.floor((this.width * this.height) / 20000));

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 2 + 2,
                orbit: Math.random() * Math.PI * 2,
                orbitSpeed: (Math.random() - 0.5) * 0.005,
                radius: Math.random() * 60 + 20,
                color: this.getRandomColor()
            });
        }
    }

    drawGlow(x, y, size, color) {
        this.ctx.shadowBlur = size * 4;
        this.ctx.shadowColor = color;
        this.ctx.fillStyle = color + '99';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach((p, i) => {
            // Orbital vibration logic
            p.orbit += p.orbitSpeed;
            const ox = Math.cos(p.orbit) * p.radius * 0.2;
            const oy = Math.sin(p.orbit) * p.radius * 0.2;

            p.x += p.vx;
            p.y += p.vy;

            // Loop edges
            if (p.x < -50) p.x = this.width + 50;
            if (p.x > this.width + 50) p.x = -50;
            if (p.y < -50) p.y = this.height + 50;
            if (p.y > this.height + 50) p.y = -50;

            const targetX = p.x + ox;
            const targetY = p.y + oy;

            // Mouse interaction
            const dx = this.mouse.x - targetX;
            const dy = this.mouse.y - targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let scale = 1;
            if (dist < this.mouse.radius) {
                scale = 1 + (1 - dist / this.mouse.radius) * 1.5;
                const force = (1 - dist / this.mouse.radius) * 0.02;
                p.vx -= dx * force;
                p.vy -= dy * force;
            }

            // Render
            this.drawGlow(targetX, targetY, p.size * scale, p.color);

            // Lines
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const p2X = p2.x + Math.cos(p2.orbit) * p2.radius * 0.2;
                const p2Y = p2.y + Math.sin(p2.orbit) * p2.radius * 0.2;

                const ldx = targetX - p2X;
                const ldy = targetY - p2Y;
                const ldist = Math.sqrt(ldx * ldx + ldy * ldy);

                if (ldist < 200) {
                    const opacity = (1 - ldist / 200) * 0.15;
                    this.ctx.strokeStyle = p.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(targetX, targetY);
                    this.ctx.lineTo(p2X, p2Y);
                    this.ctx.stroke();
                }
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialized when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PremiumAnimation());
} else {
    new PremiumAnimation();
}
