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

  const BG = '#0a0a0a', NEON = '#39ff14', PINK = '#ff2079', CYAN = '#00f0ff';
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
        const sz = rand(22, 38);
        enemies.push({ x: rand(sz, W - sz), y: -sz, sz, sp: rand(1.5, 3) + score * 0.008, rot: 0, rs: rand(-0.03, 0.03) });
        lastSpawn = ts;
        if (spawnRate > 400) spawnRate -= 2;
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.sp; e.rot += e.rs;
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
            explode(e.x, e.y, PINK);
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
      ctx.shadowColor = PINK; ctx.shadowBlur = 10;
      for (const e of enemies) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
        ctx.strokeStyle = PINK; ctx.lineWidth = 1.5;
        const h = e.sz / 2;
        ctx.strokeRect(-h, -h, e.sz, e.sz);
        ctx.fillStyle = 'rgba(255,32,121,.12)'; ctx.fillRect(-h, -h, e.sz, e.sz);
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
    makeStars();
  }

  /* ── init ──────────────────────────────────────────────── */
  function init(id) {
    canvas = document.getElementById(id);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    resize();
    window.addEventListener('resize', resize);

    // Keyboard
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ') e.preventDefault();
      if (e.key === 'Enter' && gameOver) restart();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Touch — move + auto-shoot
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (gameOver) { restart(); return; }
      const r = canvas.getBoundingClientRect();
      touchX = e.touches[0].clientX - r.left;
      autoFire = true;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    }, { passive: false });

    canvas.addEventListener('touchend', () => { touchX = null; autoFire = false; });

    // Click restart
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
