/**
 * HeroGame — Lightweight Space Shooter (HTML5 Canvas)
 * Usage: HeroGame.init('heroGameCanvas');
 */
const HeroGame = (() => {
  let canvas, ctx, W, H, animId;
  let score, gameOver, lastSpawn, spawnRate, shootCD;
  let player, bullets, enemies, particles, stars;
  let isMobile = false;
  const keys = {};
  let touchX = null, autoFire = false;
  let heroTextEl, heroTextRect;
  let touchStartX = null, touchStartY = null, isScrolling = null;

  const BG = '#0a0a0a', NEON = '#39ff14', PINK = '#ff2079', CYAN = '#00f0ff';
  const NEON_COLORS = ['#ff2079', '#00f0ff', '#ff9f00', '#f8f32b', '#ff00ff'];
  const rand = (a, b) => Math.random() * (b - a) + a;

  /* ── stars ─────────────────────────────────────────────── */
  function makeStars() {
    stars = Array.from({ length: 140 }, () => ({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.4, 1.5), sp: rand(0.2, 1), a: rand(0.3, 0.9),
    }));
  }

  /* ── main reset ────────────────────────────────────────── */
  function restart() {
    score = 0; gameOver = false; shootCD = 0;
    spawnRate = 900; lastSpawn = 0;
    bullets = []; enemies = []; particles = [];
    player = { x: W / 2, y: H - 50, w: 44, h: 41, sp: isMobile ? 5 : 9 };
  }

  /* ── spawn / update helpers ────────────────────────────── */
  function shoot() {
    if (shootCD > 0) return;
    bullets.push({ x: player.x, y: player.y - player.h });
    shootCD = isMobile ? 20 : 12;
  }

  function explode(x, y, c) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, 6.28), s = rand(1.5, 3.5);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c });
    }
  }

  /* ── game loop ─────────────────────────────────────────── */
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      s.y += s.sp; if (s.y > H) { s.y = 0; s.x = rand(0, W); }
      ctx.globalAlpha = s.a; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!gameOver) {
      // Input
      if (keys['ArrowLeft'] || keys['a']) player.x -= player.sp;
      if (keys['ArrowRight'] || keys['d']) player.x += player.sp;
      if (touchX !== null) player.x += (touchX - player.x) * 0.14;
      player.x = Math.max(player.w, Math.min(W - player.w, player.x));

      if (keys[' '] || keys['ArrowUp'] || keys['w'] || autoFire) shoot();
      if (shootCD > 0) shootCD--;

      // Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 9;
        if (bullets[i].y < -10) { bullets.splice(i, 1); continue; }
      }

      // Enemies
      if (ts - lastSpawn > spawnRate) {
        const sz = rand(20, 30);
        const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        enemies.push({ x: rand(sz, W - sz), y: -sz, sz, sp: rand(1.5, 3) + score * 0.008, rot: 0, rs: rand(-0.03, 0.03), explodedOnText: false, color: color });
        lastSpawn = ts;
        if (spawnRate > 400) spawnRate -= 2;
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.sp; e.rot += e.rs;
        
        if (heroTextRect) {
            const canvasRect = canvas.getBoundingClientRect();
            // Translate heroTextRect to be relative to the canvas
            const textTop = heroTextRect.top - canvasRect.top;
            const textBottom = heroTextRect.bottom - canvasRect.top;
            const textLeft = heroTextRect.left - canvasRect.left;
            const textRight = heroTextRect.right - canvasRect.left;

            // Check if enemy center is inside the text bounding box and hasn't exploded yet
            if (!e.explodedOnText && e.y > textTop && e.y < textBottom && e.x > textLeft && e.x < textRight) {
                explode(e.x, e.y, NEON); // Use CYAN for this explosion
                e.explodedOnText = true; // Mark as exploded
                e.sp *= 0.7; // Reduce speed by 30%
                score += 5; // Give a few points
                // No 'continue' here, enemy should still be able to hit player/bullet
            }
        }
        
        if (e.y > H + 40) { enemies.splice(i, 1); continue; }

        // Hit player
        if (Math.abs(e.x - player.x) < e.sz / 2 + player.w / 2 &&
            Math.abs(e.y - player.y) < e.sz / 2 + player.h / 2) {
          explode(player.x, player.y, NEON);
          gameOver = true; return;
        }

        // Hit bullet
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.abs(b.x - e.x) < e.sz / 2 + 3 && Math.abs(b.y - e.y) < e.sz / 2 + 6) {
            explode(e.x, e.y, e.color);
            enemies.splice(i, 1); bullets.splice(j, 1);
            score += 10; break;
          }
        }
      }

      // Draw player
      ctx.shadowColor = NEON; ctx.shadowBlur = 14;
      ctx.strokeStyle = NEON; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - player.h);
      ctx.lineTo(player.x - player.w / 2, player.y);
      ctx.lineTo(player.x + player.w / 2, player.y);
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(57,255,20,.2)'; ctx.fill();
      ctx.shadowBlur = 0;

      // Draw bullets
      ctx.shadowColor = CYAN; ctx.shadowBlur = 8; ctx.fillStyle = CYAN;
      for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y, 3, 10);
      ctx.shadowBlur = 0;

      // Draw enemies
      for (const e of enemies) {
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 18;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        const h = e.sz / 2;
        ctx.strokeRect(-h, -h, e.sz, e.sz);
        ctx.fillStyle = e.color.substring(0, 7) + '1f';
        ctx.fillRect(-h, -h, e.sz, e.sz);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
    }

    // Particles (always)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.03;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // HUD — score top-right + bottom-left
    ctx.fillStyle = NEON;
    ctx.font = 'bold 16px "JetBrains Mono","Courier New",monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SCORE ' + String(score).padStart(5, '0'), W - 16, 30);

    ctx.textAlign = 'left';
    ctx.font = '13px "JetBrains Mono","Courier New",monospace';
    ctx.globalAlpha = 0.5;
    ctx.fillText(String(score), 16, H - 16);
    ctx.globalAlpha = 1;

    // Game Over — bottom left corner
    if (gameOver) {
      ctx.textAlign = 'left';
      ctx.shadowColor = PINK; ctx.shadowBlur = 16;
      ctx.fillStyle = PINK;
      ctx.font = 'bold 28px "JetBrains Mono","Courier New",monospace';
      ctx.fillText('GAME OVER', 24, H - 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = NEON;
      ctx.font = '16px "JetBrains Mono","Courier New",monospace';
      ctx.fillText('SCORE: ' + score, 24, H - 60);

      ctx.fillStyle = '#666';
      ctx.font = '12px "JetBrains Mono","Courier New",monospace';
      ctx.fillText(isMobile ? 'Tap to restart' : 'ENTER to restart', 24, H - 36);
    }
  }

  /* ── resize ────────────────────────────────────────────── */
  function resize() {
    const p = canvas.parentElement;
    W = canvas.width = p.clientWidth;
    H = canvas.height = p.clientHeight;
    if (player) { player.x = Math.min(player.x, W - player.w); player.y = H - 70; }
    if (heroTextEl) {
        heroTextRect = heroTextEl.getBoundingClientRect();
    }
    makeStars();
  }

  /* ── init ──────────────────────────────────────────────── */
  function init(id) {
    canvas = document.getElementById(id);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    heroTextEl = document.querySelector('.hero-overlay h1');

    resize();
    window.addEventListener('resize', resize);

    // Keyboard
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ') e.preventDefault();
      if (e.key === 'Enter' && gameOver) restart();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Touch controls
    canvas.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isScrolling = null; // Reset on new touch
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (!touchStartX || !touchStartY) {
            return;
        }

        const touch = e.touches[0];
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;

        if (isScrolling === null) {
            // Determine intent after a small threshold of movement
            if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
                isScrolling = Math.abs(diffY) > Math.abs(diffX);
            }
        }

        if (isScrolling === false) {
            e.preventDefault(); // This is a horizontal game gesture, prevent scrolling
            touchX = touch.clientX - canvas.getBoundingClientRect().left;
            if (!autoFire) autoFire = true; // Start shooting on horizontal move
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        // This handles a tap-to-restart when the game is over,
        // if no scrolling or swiping has occurred.
        if (isScrolling === null && gameOver) {
            restart();
        }
        touchStartX = null;
        touchStartY = null;
        isScrolling = null;
        touchX = null;
        autoFire = false;
    });

    // Click restart (for desktop)
    canvas.addEventListener('click', () => { if (gameOver) restart(); });

    restart();
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  }

  return { init, destroy };
})();

document.addEventListener('DOMContentLoaded', () => {
    const statsBar = document.querySelector('.stats-bar');
    if (!statsBar) return;

    const animateCount = (el) => {
        const originalText = el.dataset.original;
        let targetStart, targetEnd;
        let isRange = false;

        if (originalText.includes('–')) {
            [targetStart, targetEnd] = originalText.split('–').map(Number);
            isRange = true;
        } else {
            targetEnd = Number(originalText);
        }

        const duration = 2000; // 2 seconds
        let startTime = null;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            if (isRange) {
                const currentStart = Math.floor(progress * targetStart);
                const currentEnd = Math.floor(progress * targetEnd);
                el.textContent = `${currentStart}–${currentEnd}`;
            } else {
                el.textContent = Math.floor(progress * targetEnd);
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = originalText; // Set to final original text when done
            }
        };
        
        if(isRange){
            el.textContent = "0–0";
        } else {
            el.textContent = "0";
        }

        requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-num');
                statNumbers.forEach(numEl => {
                    numEl.dataset.original = numEl.textContent;
                    animateCount(numEl);
                });
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    observer.observe(statsBar);

    // Problem Statement Carousel
    const psTrack = document.querySelector('.ps-carousel-track');
    const psGrid = document.querySelector('.ps-grid');
    const psNextBtn = document.querySelector('.ps-nav-btn--next');
    const psPrevBtn = document.querySelector('.ps-nav-btn--prev');

    if (psTrack && psGrid && psNextBtn && psPrevBtn) {
        let currentIndex = 0;
        let slideWidth = 0;
        let slidesInView = 0;
        const cardGap = 16;

        const updateCarouselDimensions = () => {
            const firstCard = psGrid.querySelector('.ps-card');
            if (!firstCard) return;

            const cardWidth = firstCard.offsetWidth;
            slidesInView = Math.floor(psTrack.offsetWidth / (cardWidth + cardGap));
            slideWidth = (cardWidth + cardGap) * slidesInView;
            
            updateCarousel();
        };

        const updateButtons = () => {
            const totalCards = psGrid.children.length;
            const maxIndex = Math.ceil(totalCards / slidesInView) - 1;

            psPrevBtn.disabled = currentIndex === 0;
            psNextBtn.disabled = currentIndex >= maxIndex;
        };

        const updateCarousel = () => {
            psGrid.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
            updateButtons();
        };

        psNextBtn.addEventListener('click', () => {
            const totalCards = psGrid.children.length;
            const maxIndex = Math.ceil(totalCards / slidesInView) - 1;
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            }
        });

        psPrevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        window.addEventListener('resize', updateCarouselDimensions);

        // Initial setup
        updateCarouselDimensions();
    }

    // Timeline Animation
    const timelineItems = document.querySelectorAll('.tl-item');
    if (timelineItems.length > 0) {
        const timelineObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Use the actual index from a data attribute if order matters, otherwise this is fine
                    entry.target.style.transitionDelay = `${(entry.target.dataset.index || index) * 150}ms`;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% of the item is visible
            rootMargin: '0px 0px -50px 0px' // Start animation a bit before it's fully in view
        });

        timelineItems.forEach((item, index) => {
            item.dataset.index = index;
            timelineObserver.observe(item);
        });
    }
});
