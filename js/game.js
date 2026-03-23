// ============================================================
// 셀 디펜더 - Cell Defender (HTML5 Canvas Game Engine)
// ============================================================
const APP_VERSION = "1.0.0";
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ── 해상도 ──
let W, H, CX, CY, SCALE;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = 720;
  H = 1280;
  const r = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W * r + "px";
  canvas.style.height = H * r + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  SCALE = r;
  CX = W / 2;
  CY = H / 2;
}
window.addEventListener("resize", resize);
resize();

// ── 세이브 데이터 ──
const DEF_SAVE = {
  coins: 0,
  highScore: 0,
  totalGames: 0,
  totalWords: 0,
  dmgLv: 0,
  rateLv: 0,
  spdLv: 0,
  cntLv: 0,
  hpLv: 0,
  critLv: 0,
};
let save = { ...DEF_SAVE };
function loadSave() {
  try {
    const s = localStorage.getItem("celldef_save");
    if (s) save = { ...DEF_SAVE, ...JSON.parse(s) };
  } catch (e) {}
}
function saveSave() {
  localStorage.setItem("celldef_save", JSON.stringify(save));
}
loadSave();

// ── 기본 스탯 ──
function baseDmg() {
  return 10 + save.dmgLv * 3;
}
function baseRate() {
  return Math.max(0.08, 0.5 - save.rateLv * 0.03);
}
function baseBulletSpd() {
  return 400 + save.spdLv * 30;
}
function baseCnt() {
  return 1 + save.cntLv;
}
function baseMaxHp() {
  return 5 + save.hpLv;
}
function baseCrit() {
  return 0.05 + save.critLv * 0.03;
}
function upgradeCost(lv) {
  return 100 + lv * 80;
}

// ── 게임 상태 ──
let STATE = "menu"; // menu, game, shop, upgrade, gameover, quiz
let quizRewardType = "";

// ── 인게임 변수 ──
let hp, maxHp, score, wave, xp, xpNext, level, kills, gameTime;
let dmgMult, rateMult, spdMult, cntBonus, pierce, critBonus;
let hasHoming, hasChain, hasFreeze, hasPoison, orbitCount;
let fireTimer, waveTimer, spawnTimer, spawnInterval, chestTimer;
let enemies, bullets, effects, chests, orbits;
let upgradeChoices = [];
let quizData = null,
  quizTimer = 0,
  quizAnswered = false,
  quizResult = "";
let touchX = null,
  touchY = null;
let reviveUsed = false;

// 배경 별
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 1.5 + 0.5,
  a: Math.random(),
}));

// ── 업그레이드 목록 ──
const ALL_UPGRADES = [
  { id: "dmg", name: "공격력 증가", desc: "데미지 +30%", c: "#ff4444" },
  { id: "rate", name: "연사 속도", desc: "발사속도 +15%", c: "#ff8800" },
  { id: "spd", name: "탄속 증가", desc: "총알속도 +20%", c: "#00ddff" },
  { id: "cnt", name: "멀티샷", desc: "총알 +1개", c: "#44aaff" },
  { id: "pierce", name: "관통 알약", desc: "관통 +1회", c: "#aa44ff" },
  { id: "crit", name: "치명타 강화", desc: "크리티컬 +10%", c: "#ffdd00" },
  { id: "homing", name: "유도탄", desc: "적 추적 총알", c: "#44ff44" },
  { id: "chain", name: "연쇄 사격", desc: "연쇄 데미지", c: "#8888ff" },
  { id: "freeze", name: "빙결탄", desc: "적 1.5초 동결", c: "#aaddff" },
  { id: "poison", name: "독 공격", desc: "지속 독뎀", c: "#66ee33" },
  { id: "orbit", name: "궤도 방어", desc: "회전 공격체", c: "#4488ff" },
  { id: "heal", name: "체력 회복", desc: "HP +2", c: "#44ff88" },
  { id: "maxhp", name: "최대체력+", desc: "최대HP +1", c: "#ff6688" },
];

// ── 초기화 ──
function initGame() {
  maxHp = baseMaxHp();
  hp = maxHp;
  score = 0;
  wave = 1;
  xp = 0;
  xpNext = 10;
  level = 1;
  kills = 0;
  gameTime = 0;
  dmgMult = 1;
  rateMult = 1;
  spdMult = 1;
  cntBonus = 0;
  pierce = 0;
  critBonus = 0;
  hasHoming = false;
  hasChain = false;
  hasFreeze = false;
  hasPoison = false;
  orbitCount = 0;
  fireTimer = 0;
  waveTimer = 0;
  spawnTimer = 0;
  spawnInterval = 2;
  chestTimer = 0;
  reviveUsed = false;
  enemies = [];
  bullets = [];
  effects = [];
  chests = [];
  orbits = [];
  STATE = "game";
}

// ── 적 ──
function spawnEnemy() {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.max(W, H) * 0.6;
  const ehp = 20 + wave * 10;
  const chain = Math.min(3 + Math.floor(wave / 2), 12);
  const spd = 30 + wave * 2;
  const hue = Math.random() * 360;
  const trail = [];
  const sx = CX + Math.cos(angle) * dist;
  const sy = CY + Math.sin(angle) * dist;
  for (let i = 0; i < chain * 15 + 5; i++) trail.push({ x: sx, y: sy });
  enemies.push({
    x: sx,
    y: sy,
    hp: ehp,
    maxHp: ehp,
    spd,
    chain,
    trail,
    hue,
    frozen: 0,
    poisoned: 0,
    poisonDps: 0,
  });
}

function spawnChest() {
  const a = Math.random() * Math.PI * 2;
  const d = 120 + Math.random() * 200;
  chests.push({ x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, t: 0 });
}

// ── 총알 발사 ──
function fireBullets() {
  const total = baseCnt() + cntBonus;
  let nearest = null,
    minD = Infinity;
  for (const e of enemies) {
    const d = Math.hypot(e.x - CX, e.y - CY);
    if (d < minD) {
      minD = d;
      nearest = e;
    }
  }
  let baseAngle;
  if (nearest) {
    baseAngle = Math.atan2(nearest.y - CY, nearest.x - CX);
  } else {
    baseAngle = gameTime * 0.5;
  }
  for (let i = 0; i < total; i++) {
    const spread = 0.26; // ~15deg
    const off = (i - (total - 1) / 2) * spread;
    const a = baseAngle + off;
    const dmg = baseDmg() * dmgMult;
    const isCrit = Math.random() < baseCrit() + critBonus;
    bullets.push({
      x: CX,
      y: CY,
      dx: Math.cos(a),
      dy: Math.sin(a),
      spd: baseBulletSpd() * spdMult,
      dmg: isCrit ? dmg * 2 : dmg,
      isCrit,
      pierce: pierce,
      homing: hasHoming,
      chain: hasChain,
      freeze: hasFreeze,
      poison: hasPoison,
      life: 3,
    });
  }
}

// ── 이펙트 ──
function addEffect(x, y, type, text) {
  effects.push({
    x,
    y,
    type,
    text,
    t: 0,
    maxT: type === "dmg" ? 0.6 : 0.4,
    vx: (Math.random() - 0.5) * 60,
    vy: -80,
    particles:
      type === "death"
        ? Array.from({ length: 8 }, () => ({
            a: Math.random() * Math.PI * 2,
            s: 60 + Math.random() * 140,
            r: 2 + Math.random() * 5,
          }))
        : null,
  });
}

// ── 업그레이드 적용 ──
function applyUpgrade(id) {
  switch (id) {
    case "dmg":
      dmgMult += 0.3;
      break;
    case "rate":
      rateMult *= 0.85;
      break;
    case "spd":
      spdMult += 0.2;
      break;
    case "cnt":
      cntBonus++;
      break;
    case "pierce":
      pierce++;
      break;
    case "crit":
      critBonus += 0.1;
      break;
    case "homing":
      hasHoming = true;
      break;
    case "chain":
      hasChain = true;
      break;
    case "freeze":
      hasFreeze = true;
      break;
    case "poison":
      hasPoison = true;
      break;
    case "orbit":
      orbitCount++;
      break;
    case "heal":
      hp = Math.min(hp + 2, maxHp);
      break;
    case "maxhp":
      maxHp++;
      hp++;
      break;
  }
  STATE = "game";
}

function showUpgradePanel() {
  const shuffled = [...ALL_UPGRADES].sort(() => Math.random() - 0.5);
  upgradeChoices = shuffled.slice(0, 3);
  STATE = "upgrade";
}

// ── 퀴즈 ──
function startQuiz(rewardType) {
  quizRewardType = rewardType;
  quizData = getQuizQuestion();
  quizTimer = 10;
  quizAnswered = false;
  quizResult = "";
  STATE = "quiz";
}

function answerQuiz(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  if (quizData.choices[idx] === quizData.answer) {
    quizResult = "correct";
    save.totalWords++;
    saveSave();
    setTimeout(() => {
      STATE =
        quizRewardType === "revive"
          ? "game"
          : quizRewardType === "shop_discount"
            ? "shop"
            : "game";
      if (quizRewardType === "revive") {
        hp = maxHp;
        enemies = [];
        reviveUsed = true;
      } else if (quizRewardType === "coins") {
        save.coins += 50;
        saveSave();
      } else if (quizRewardType === "upgrade") showUpgradePanel();
    }, 1200);
  } else {
    quizResult = "wrong";
    setTimeout(() => {
      STATE =
        quizRewardType === "revive"
          ? "gameover"
          : quizRewardType === "shop_discount"
            ? "shop"
            : "game";
    }, 1500);
  }
}

// ── 업데이트 ──
function update(dt) {
  if (STATE !== "game") return;
  gameTime += dt;

  // 발사
  fireTimer += dt;
  const rate = baseRate() * rateMult;
  if (fireTimer >= Math.max(rate, 0.05)) {
    fireTimer = 0;
    fireBullets();
  }

  // 웨이브
  waveTimer += dt;
  if (waveTimer >= 15) {
    waveTimer = 0;
    wave++;
    spawnInterval = Math.max(0.3, 2 - wave * 0.1);
  }

  // 적 스폰
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnEnemy();
  }

  // 보물상자
  chestTimer += dt;
  if (chestTimer >= 20) {
    chestTimer = 0;
    spawnChest();
  }

  // 총알 이동 & 충돌
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // 유도
    if (b.homing) {
      let nearest = null,
        minD = 300;
      for (const e of enemies) {
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < minD) {
          minD = d;
          nearest = e;
        }
      }
      if (nearest) {
        const da = Math.atan2(nearest.y - b.y, nearest.x - b.x);
        const ca = Math.atan2(b.dy, b.dx);
        let diff = da - ca;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.min(Math.abs(diff), 5 * dt) * Math.sign(diff);
        const na = ca + turn;
        b.dx = Math.cos(na);
        b.dy = Math.sin(na);
      }
    }

    b.x += b.dx * b.spd * dt;
    b.y += b.dy * b.spd * dt;

    // 화면 밖
    if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
      bullets.splice(i, 1);
      continue;
    }

    // 적 충돌
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < 22) {
        e.hp -= b.dmg;
        addEffect(e.x, e.y, "dmg", Math.floor(b.dmg).toString());

        if (b.freeze) e.frozen = 1.5;
        if (b.poison) {
          e.poisoned = 3;
          e.poisonDps = b.dmg * 0.2;
        }
        if (b.chain) {
          for (const e2 of enemies) {
            if (e2 !== e && Math.hypot(e2.x - e.x, e2.y - e.y) < 120) {
              e2.hp -= b.dmg * 0.5;
              addEffect(e2.x, e2.y, "dmg", Math.floor(b.dmg * 0.5).toString());
              break;
            }
          }
        }

        if (e.hp <= 0) {
          const xpVal = Math.max(1, Math.floor(e.maxHp / 10));
          const coinVal = Math.max(1, Math.floor(e.maxHp / 20));
          xp += xpVal;
          score += xpVal * 10;
          kills++;
          save.coins += coinVal;
          addEffect(e.x, e.y, "death", "");
          enemies.splice(j, 1);
          if (xp >= xpNext) {
            xp -= xpNext;
            level++;
            xpNext = Math.floor(xpNext * 1.3);
            showUpgradePanel();
          }
        }

        b.pierce--;
        if (b.pierce < 0) {
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // 적 이동
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.frozen > 0) {
      e.frozen -= dt;
      continue;
    }
    if (e.poisoned > 0) {
      e.poisoned -= dt;
      e.hp -= e.poisonDps * dt;
      if (e.hp <= 0) {
        addEffect(e.x, e.y, "death", "");
        const xpVal = Math.max(1, Math.floor(e.maxHp / 10));
        xp += xpVal;
        score += xpVal * 10;
        kills++;
        save.coins += Math.max(1, Math.floor(e.maxHp / 20));
        enemies.splice(i, 1);
        if (xp >= xpNext) {
          xp -= xpNext;
          level++;
          xpNext = Math.floor(xpNext * 1.3);
          showUpgradePanel();
        }
        continue;
      }
    }

    const dx = CX - e.x,
      dy = CY - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) {
      hp--;
      enemies.splice(i, 1);
      if (hp <= 0) {
        STATE = "gameover";
        save.totalGames++;
        if (score > save.highScore) save.highScore = score;
        saveSave();
      }
      continue;
    }
    const nx = dx / d,
      ny = dy / d;
    e.x += nx * e.spd * dt;
    e.y += ny * e.spd * dt;
    e.trail.unshift({ x: e.x, y: e.y });
    if (e.trail.length > e.chain * 15 + 5) e.trail.length = e.chain * 15 + 5;
  }

  // 궤도 공격체
  if (orbitCount > 0) {
    for (const e of enemies) {
      for (let oi = 0; oi < orbitCount; oi++) {
        const oa = gameTime * 2 + ((Math.PI * 2) / orbitCount) * oi;
        const ox = CX + Math.cos(oa) * 80;
        const oy = CY + Math.sin(oa) * 80;
        if (Math.hypot(e.x - ox, e.y - oy) < 28) {
          e.hp -= baseDmg() * dmgMult * 0.3 * dt;
        }
      }
    }
  }

  // 이펙트
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].t += dt;
    if (effects[i].t >= effects[i].maxT) effects.splice(i, 1);
  }

  // 퀴즈 타이머
  if (STATE === "quiz" && !quizAnswered) {
    quizTimer -= dt;
    if (quizTimer <= 0) {
      quizAnswered = true;
      quizResult = "wrong";
      setTimeout(() => {
        STATE = quizRewardType === "revive" ? "gameover" : "game";
      }, 1500);
    }
  }
}

// ── 렌더링 ──
function draw() {
  ctx.fillStyle = "#0d0a1a";
  ctx.fillRect(0, 0, W, H);

  // 배경 별
  for (const s of stars) {
    s.a += 0.01;
    ctx.globalAlpha = 0.3 + Math.sin(s.a) * 0.2;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (STATE === "menu") {
    drawMenu();
    return;
  }
  if (STATE === "shop") {
    drawShop();
    return;
  }

  // 게임 배경 원
  ctx.strokeStyle = "rgba(100,100,255,0.08)";
  for (let r = 100; r < 600; r += 100) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 보물상자
  for (const c of chests) {
    c.t += 0.016;
    const by = c.y + Math.sin(c.t * 3) * 4;
    ctx.fillStyle = "#c8961e";
    ctx.fillRect(c.x - 18, by - 12, 36, 24);
    ctx.fillStyle = "#eab832";
    ctx.fillRect(c.x - 15, by - 9, 30, 18);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(c.x - 5, by - 3, 10, 6);
    // 빛남
    ctx.globalAlpha = 0.15 + Math.sin(c.t * 4) * 0.1;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(c.x, by, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 적
  for (const e of enemies) {
    const col = `hsl(${e.hue},70%,50%)`;
    const colLight = `hsl(${e.hue},70%,65%)`;
    const colDark = `hsl(${e.hue},70%,35%)`;

    // 체인(꼬리)
    for (let ci = e.chain - 1; ci >= 0; ci--) {
      const idx = (ci + 1) * 15;
      if (idx >= e.trail.length) continue;
      const tp = e.trail[idx];
      const r = Math.max(6, 14 - ci * 0.8);
      ctx.fillStyle = ci % 2 === 0 ? col : colDark;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colLight;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, r - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 머리
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colLight;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 13, 0, Math.PI * 2);
    ctx.fill();

    // HP 텍스트
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.ceil(e.hp), e.x, e.y);

    // 상태이상 표시
    if (e.frozen > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#aaddff";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.poisoned > 0) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#44ff00";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // 총알
  for (const b of bullets) {
    const sz = b.isCrit ? 10 : 6;
    ctx.fillStyle = b.isCrit ? "#ffcc00" : "#66ccff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, sz * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 궤적
    ctx.strokeStyle = b.isCrit
      ? "rgba(255,200,0,0.3)"
      : "rgba(100,200,255,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.dx * 12, b.y - b.dy * 12);
    ctx.stroke();
  }

  // 궤도 공격체
  for (let oi = 0; oi < orbitCount; oi++) {
    const oa = gameTime * 2 + ((Math.PI * 2) / Math.max(orbitCount, 1)) * oi;
    const ox = CX + Math.cos(oa) * 80;
    const oy = CY + Math.sin(oa) * 80;
    ctx.fillStyle = "#00ccff";
    ctx.beginPath();
    ctx.arc(ox, oy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#88eeff";
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 하트 (중앙)
  drawHeart(CX, CY, 25 + Math.sin(gameTime * 3) * 2);

  // 이펙트
  for (const ef of effects) {
    const prog = ef.t / ef.maxT;
    ctx.globalAlpha = 1 - prog;
    if (ef.type === "dmg") {
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ef.text, ef.x + ef.vx * prog, ef.y + ef.vy * prog * 0.5);
    } else if (ef.type === "death") {
      for (const p of ef.particles) {
        const px = ef.x + Math.cos(p.a) * p.s * prog;
        const py = ef.y + Math.sin(p.a) * p.s * prog;
        ctx.fillStyle = `hsl(${Math.random() * 60},100%,60%)`;
        ctx.beginPath();
        ctx.arc(px, py, p.r * (1 - prog), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // UI
  drawGameUI();

  // 오버레이
  if (STATE === "upgrade") drawUpgradePanel();
  if (STATE === "gameover") drawGameOver();
  if (STATE === "quiz") drawQuiz();
}

function drawHeart(x, y, sz) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e81030";
  ctx.beginPath();
  ctx.moveTo(0, sz * 0.35);
  ctx.bezierCurveTo(
    -sz * 0.1,
    sz * 0.1,
    -sz * 0.6,
    sz * 0.1,
    -sz * 0.6,
    -sz * 0.2,
  );
  ctx.bezierCurveTo(
    -sz * 0.6,
    -sz * 0.55,
    -sz * 0.1,
    -sz * 0.55,
    0,
    -sz * 0.25,
  );
  ctx.bezierCurveTo(
    sz * 0.1,
    -sz * 0.55,
    sz * 0.6,
    -sz * 0.55,
    sz * 0.6,
    -sz * 0.2,
  );
  ctx.bezierCurveTo(sz * 0.6, sz * 0.1, sz * 0.1, sz * 0.1, 0, sz * 0.35);
  ctx.fill();
  // 하이라이트
  ctx.fillStyle = "rgba(255,150,150,0.5)";
  ctx.beginPath();
  ctx.arc(-sz * 0.2, -sz * 0.2, sz * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // 보호 링
  ctx.strokeStyle = `rgba(255,80,80,${0.2 + Math.sin(gameTime * 2) * 0.1})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, sz + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGameUI() {
  // HP 바
  const hpW = 400,
    hpH = 22,
    hpX = 20,
    hpY = 18;
  ctx.fillStyle = "#333";
  ctx.fillRect(hpX, hpY, hpW, hpH);
  const hpRatio = hp / maxHp;
  const hpColor =
    hpRatio > 0.5 ? "#44dd44" : hpRatio > 0.25 ? "#ddaa00" : "#dd3333";
  ctx.fillStyle = hpColor;
  ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
  ctx.strokeStyle = "#666";
  ctx.strokeRect(hpX, hpY, hpW, hpH);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`HP ${hp}/${maxHp}`, hpX + 8, hpY + 16);

  // 점수
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(score.toLocaleString(), W - 20, 35);

  // 웨이브
  ctx.fillStyle = "#aaa";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`WAVE ${wave}`, 20, 58);

  // 코인
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "right";
  ctx.fillText(`🪙 ${save.coins}`, W - 20, 58);

  // XP 바
  const xpW = W - 140,
    xpH = 14,
    xpX = 20,
    xpY = H - 35;
  ctx.fillStyle = "#222";
  ctx.fillRect(xpX, xpY, xpW, xpH);
  ctx.fillStyle = "#5588ff";
  ctx.fillRect(xpX, xpY, xpW * (xp / xpNext), xpH);
  ctx.strokeStyle = "#444";
  ctx.strokeRect(xpX, xpY, xpW, xpH);

  // 레벨
  ctx.fillStyle = "#aaf";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Lv.${level}`, W - 20, H - 22);
}

// ── 업그레이드 패널 ──
function drawUpgradePanel() {
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⬆ 속성 강화 ⬆", CX, CY - 220);

  for (let i = 0; i < 3; i++) {
    const u = upgradeChoices[i];
    const bx = CX - 200,
      by = CY - 160 + i * 130,
      bw = 400,
      bh = 110;
    // 배경
    ctx.fillStyle = u.c + "33";
    ctx.strokeStyle = u.c;
    ctx.lineWidth = 3;
    roundRect(ctx, bx, by, bw, bh, 14, true, true);
    // 텍스트
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(u.name, CX, by + 42);
    ctx.fillStyle = "#ccc";
    ctx.font = "16px sans-serif";
    ctx.fillText(u.desc, CX, by + 72);
    // 선택 영역 저장
    u._rect = { x: bx, y: by, w: bw, h: bh };
  }
}

// ── 게임오버 ──
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ff4444";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", CX, CY - 180);
  ctx.fillStyle = "#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText(`점수: ${score.toLocaleString()}`, CX, CY - 120);
  ctx.fillText(`웨이브 ${wave} | ${kills} 처치`, CX, CY - 85);

  // 부활 버튼
  if (!reviveUsed) {
    drawButton(
      CX - 180,
      CY - 30,
      360,
      60,
      "📝 영단어 퀴즈 풀고 부활!",
      "#1a5c2a",
      "#33aa55",
      "revive",
    );
  }
  drawButton(
    CX - 180,
    CY + 50,
    360,
    55,
    "🔄 다시하기",
    "#2a2a5c",
    "#5555aa",
    "retry",
  );
  drawButton(
    CX - 180,
    CY + 120,
    360,
    55,
    "🏠 메인 메뉴",
    "#3c2a2a",
    "#885555",
    "menu_go",
  );
}

// ── 퀴즈 ──
function drawQuiz() {
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, W, H);

  // 타이머
  const tW = 500,
    tH = 16,
    tX = CX - tW / 2,
    tY = CY - 270;
  ctx.fillStyle = "#333";
  ctx.fillRect(tX, tY, tW, tH);
  ctx.fillStyle = quizTimer > 3 ? "#44aa44" : "#dd3333";
  ctx.fillRect(tX, tY, tW * (quizTimer / 10), tH);

  // 힌트
  ctx.fillStyle = "#aaa";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(quizData.hint, CX, CY - 230);

  // 문제
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(quizData.question, CX, CY - 175);

  // 4지선다
  for (let i = 0; i < 4; i++) {
    const bx = CX - 250,
      by = CY - 120 + i * 75,
      bw = 500,
      bh = 58;
    let bg = "#1a2040",
      border = "#3355aa";
    if (quizAnswered) {
      if (quizData.choices[i] === quizData.answer) {
        bg = "#1a5c2a";
        border = "#33cc55";
      } else if (quizResult === "wrong") {
        bg = "#5c1a1a";
        border = "#cc3333";
      }
    }
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 10, true, true);
    ctx.fillStyle = "#fff";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(quizData.choices[i], CX, by + 36);
    if (!quizData.choices[i]._rect) quizData.choices[i] = quizData.choices[i]; // keep ref
  }
  // 선택 영역 저장
  quizData._rects = [];
  for (let i = 0; i < 4; i++) {
    quizData._rects.push({ x: CX - 250, y: CY - 120 + i * 75, w: 500, h: 58 });
  }

  // 결과
  if (quizResult) {
    ctx.font = "bold 24px sans-serif";
    if (quizResult === "correct") {
      ctx.fillStyle = "#44ff88";
      ctx.fillText("✅ 정답! 보상 획득!", CX, CY + 210);
    } else {
      ctx.fillStyle = "#ff4444";
      ctx.fillText("❌ 오답! 정답: " + quizData.answer, CX, CY + 210);
    }
  }
}

// ── 메인 메뉴 ──
function drawMenu() {
  // 타이틀
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("셀 디펜더", CX, CY - 220);
  ctx.fillStyle = "#88aaff";
  ctx.font = "20px sans-serif";
  ctx.fillText("Cell Defender - 영단어 학습 슈팅", CX, CY - 180);

  // 하트 장식
  drawHeart(CX, CY - 100, 40);

  // 버튼들
  drawButton(
    CX - 160,
    CY + 0,
    320,
    70,
    "▶ 게임 시작",
    "#1a3c1a",
    "#44aa44",
    "play",
  );
  drawButton(
    CX - 160,
    CY + 90,
    320,
    60,
    "🏪 상점",
    "#2a2a4c",
    "#6666cc",
    "shop_go",
  );
  drawButton(
    CX - 160,
    CY + 170,
    320,
    60,
    "📝 영단어 연습",
    "#3c2a1a",
    "#cc8844",
    "practice",
  );

  // 통계
  ctx.fillStyle = "#888";
  ctx.font = "15px sans-serif";
  ctx.fillText(`최고 점수: ${save.highScore.toLocaleString()}`, CX, CY + 280);
  ctx.fillText(
    `총 게임: ${save.totalGames} | 맞춘 영단어: ${save.totalWords}`,
    CX,
    CY + 305,
  );

  // 코인
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "right";
  ctx.font = "18px sans-serif";
  ctx.fillText(`🪙 ${save.coins}`, W - 20, 35);

  // 버전
  ctx.fillStyle = "#444";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`v${APP_VERSION}`, CX, H - 20);
}

// ── 상점 ──
let shopDiscount = false;
const SHOP_ITEMS = [
  { key: "dmgLv", name: "기본 공격력", desc: "데미지 +3", icon: "⚔️" },
  { key: "rateLv", name: "기본 연사력", desc: "발사속도 증가", icon: "🔥" },
  { key: "spdLv", name: "기본 탄속", desc: "총알속도 +30", icon: "💨" },
  { key: "cntLv", name: "기본 멀티샷", desc: "총알 수 +1", icon: "🔫" },
  { key: "hpLv", name: "기본 체력", desc: "최대HP +1", icon: "❤️" },
  { key: "critLv", name: "기본 크리티컬", desc: "크리율 +3%", icon: "💥" },
];

function drawShop() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏪 상점", CX, 50);

  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "right";
  ctx.font = "18px sans-serif";
  ctx.fillText(`🪙 ${save.coins}`, W - 20, 50);

  // 뒤로
  drawButton(15, 15, 90, 40, "← 뒤로", "#333", "#666", "menu_go");

  // 퀴즈 할인 버튼
  if (!shopDiscount) {
    drawButton(
      CX - 280,
      80,
      560,
      55,
      "📝 영단어 퀴즈 풀고 50% 할인!",
      "#1a4c2a",
      "#33aa55",
      "shop_quiz",
    );
  } else {
    ctx.fillStyle = "#44ff88";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎉 50% 할인 적용중!", CX, 110);
  }

  // 아이템 목록
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const item = SHOP_ITEMS[i];
    const lv = save[item.key];
    let cost = upgradeCost(lv);
    if (shopDiscount) cost = Math.floor(cost * 0.5);
    const bx = 30,
      by = 155 + i * 95,
      bw = W - 60,
      bh = 80;

    ctx.fillStyle = "#151525";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 10, true, true);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${item.icon} ${item.name} (Lv.${lv})`, bx + 15, by + 32);
    ctx.fillStyle = "#999";
    ctx.font = "13px sans-serif";
    ctx.fillText(item.desc, bx + 15, by + 55);

    // 구매 버튼
    const bbx = bx + bw - 130,
      bby = by + 15,
      bbw = 115,
      bbh = 50;
    const canBuy = save.coins >= cost;
    drawButton(
      bbx,
      bby,
      bbw,
      bbh,
      `🪙 ${cost}`,
      canBuy ? "#2a1a4c" : "#2a2a2a",
      canBuy ? "#8844cc" : "#555",
      `buy_${item.key}`,
    );
  }
}

// ── UI 유틸리티 ──
const buttonRects = {};
function drawButton(x, y, w, h, text, bg, border, id) {
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10, true, true);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.textBaseline = "alphabetic";
  buttonRects[id] = { x, y, w, h };
}

function roundRect(c, x, y, w, h, r, fill, stroke) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
  if (fill) c.fill();
  if (stroke) c.stroke();
}

function hitTest(px, py, rect) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

// ── 입력 처리 ──
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x =
    (((e.clientX || e.touches?.[0]?.clientX || 0) - rect.left) / rect.width) *
    W;
  const y =
    (((e.clientY || e.touches?.[0]?.clientY || 0) - rect.top) / rect.height) *
    H;
  return { x, y };
}

function handleClick(px, py) {
  if (STATE === "menu") {
    if (buttonRects.play && hitTest(px, py, buttonRects.play)) initGame();
    if (buttonRects.shop_go && hitTest(px, py, buttonRects.shop_go)) {
      STATE = "shop";
      shopDiscount = false;
    }
    if (buttonRects.practice && hitTest(px, py, buttonRects.practice))
      startQuiz("practice");
  } else if (STATE === "shop") {
    if (buttonRects.menu_go && hitTest(px, py, buttonRects.menu_go))
      STATE = "menu";
    if (buttonRects.shop_quiz && hitTest(px, py, buttonRects.shop_quiz))
      startQuiz("shop_discount");
    for (const item of SHOP_ITEMS) {
      const id = `buy_${item.key}`;
      if (buttonRects[id] && hitTest(px, py, buttonRects[id])) {
        let cost = upgradeCost(save[item.key]);
        if (shopDiscount) cost = Math.floor(cost * 0.5);
        if (save.coins >= cost) {
          save.coins -= cost;
          save[item.key]++;
          saveSave();
        }
      }
    }
  } else if (STATE === "upgrade") {
    for (let i = 0; i < upgradeChoices.length; i++) {
      const u = upgradeChoices[i];
      if (u._rect && hitTest(px, py, u._rect)) {
        applyUpgrade(u.id);
        break;
      }
    }
  } else if (STATE === "gameover") {
    if (
      buttonRects.revive &&
      hitTest(px, py, buttonRects.revive) &&
      !reviveUsed
    )
      startQuiz("revive");
    if (buttonRects.retry && hitTest(px, py, buttonRects.retry)) initGame();
    if (buttonRects.menu_go && hitTest(px, py, buttonRects.menu_go))
      STATE = "menu";
  } else if (STATE === "quiz" && !quizAnswered && quizData?._rects) {
    for (let i = 0; i < 4; i++) {
      if (hitTest(px, py, quizData._rects[i])) {
        answerQuiz(i);
        break;
      }
    }
  } else if (STATE === "game") {
    // 보물상자 터치
    for (let i = chests.length - 1; i >= 0; i--) {
      const c = chests[i];
      if (Math.hypot(px - c.x, py - c.y) < 30) {
        chests.splice(i, 1);
        showUpgradePanel();
        break;
      }
    }
  }
}

canvas.addEventListener("click", (e) => {
  const p = getCanvasPos(e);
  handleClick(p.x, p.y);
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const p = getCanvasPos(e);
    handleClick(p.x, p.y);
  },
  { passive: false },
);

// ── 게임 루프 ──
let lastTime = 0;
function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

// ── 업데이트 체크 (GitHub Releases) ──
async function checkUpdate() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/insushim/iwenglishdefen/releases/latest",
    );
    if (!res.ok) return;
    const data = await res.json();
    const latest = data.tag_name?.replace("v", "");
    if (latest && latest !== APP_VERSION) {
      document.getElementById("updateBanner").classList.remove("hidden");
      document.getElementById("updateBtn").onclick = () =>
        window.location.reload();
    }
  } catch (e) {}
}
setTimeout(checkUpdate, 3000);
