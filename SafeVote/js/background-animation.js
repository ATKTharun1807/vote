/**
 * SafeVote Background Animation
 * Premium Neural Network / Particle Effect
 */

class ParticleAnimation {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 80;
        this.connectionDistance = 150;
        this.mouse = { x: null, y: null, radius: 180 };
        this.theme = 'light';

        this.init();
    }

    init() {
        this.canvas.id = 'bg-animation-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.opacity = '0.6';
        document.body.prepend(this.canvas);

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        this.resize();
        this.createParticles();
        this.animate();

        // Observe theme changes on html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    this.updateTheme();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        this.updateTheme();
    }

    updateTheme() {
        this.theme = document.documentElement.getAttribute('data-theme') || 'light';
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Adjust particle count based on screen size - more dense
        this.particleCount = Math.min(150, Math.floor((window.innerWidth * window.innerHeight) / 12000));
        this.connectionDistance = 180; // Increased from 150
        this.createParticles();
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let color, lineColor;
        if (this.theme === 'dark') {
            color = 'rgba(59, 130, 246, 0.7)'; // Brighter Blue
            lineColor = 'rgba(59, 130, 246, 0.2)';
        } else if (this.theme === 'eye-protection') {
            color = 'rgba(139, 94, 60, 0.7)'; // Brighter Brown
            lineColor = 'rgba(139, 94, 60, 0.2)';
        } else {
            color = 'rgba(37, 99, 235, 0.5)'; // Brighter Primary Blue
            lineColor = 'rgba(37, 99, 235, 0.15)';
        }

        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];

            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            // Mouse interaction - subtle attraction
            if (this.mouse.x) {
                let dx = this.mouse.x - p.x;
                let dy = this.mouse.y - p.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.mouse.radius) {
                    p.x += dx * 0.01; // Increased attraction
                    p.y += dy * 0.01;
                }
            }

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            for (let j = i + 1; j < this.particles.length; j++) {
                let p2 = this.particles[j];
                let dx = p.x - p2.x;
                let dy = p.y - p2.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    // Line opacity based on distance
                    const alpha = (1 - (distance / this.connectionDistance)) * (this.theme === 'dark' ? 0.3 : 0.2);
                    this.ctx.strokeStyle = lineColor.replace(/[\d.]+\)$/g, `${alpha})`);
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}

// Initialized when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ParticleAnimation());
} else {
    new ParticleAnimation();
}
