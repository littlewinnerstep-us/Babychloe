// Shared avatar drawing helpers for 2D world, 3D head/accessories, and AuthModal live preview

export function drawAvatarHeadAndHair(ctx, hx, hy, scale, cAv) {
  const isBoy = cAv?.gender === 'boy';
  const hair = cAv?.hairColor || '#2c221e';
  const hairStyle = cAv?.hairStyle || (isBoy ? 'short' : 'long');

  // Back hair layers (drawn behind face)
  ctx.fillStyle = hair;
  if (hairStyle === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(hx, hy - 10 * scale, 5.5 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(hx + 6.5 * scale, hy - 4 * scale, 3.6 * scale, 7.5 * scale, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'twin') {
    ctx.beginPath();
    ctx.ellipse(hx - 10 * scale, hy + 2.5 * scale, 3.5 * scale, 8.5 * scale, 0.2, 0, Math.PI * 2);
    ctx.ellipse(hx + 10 * scale, hy + 2.5 * scale, 3.5 * scale, 8.5 * scale, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face
  ctx.fillStyle = '#f5d2b8';
  ctx.beginPath();
  ctx.arc(hx, hy, 9.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Crown & Front Hair
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx, hy - 2 * scale, 9.9 * scale, Math.PI, 0);
  ctx.fill();

  if (hairStyle === 'long') {
    ctx.beginPath();
    ctx.ellipse(hx - 7.8 * scale, hy + 4.5 * scale, 3.2 * scale, 8.5 * scale, 0.12, 0, Math.PI * 2);
    ctx.ellipse(hx + 7.8 * scale, hy + 4.5 * scale, 3.2 * scale, 8.5 * scale, -0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'bob') {
    ctx.beginPath();
    ctx.ellipse(hx - 7.6 * scale, hy + 1.5 * scale, 3.3 * scale, 5.4 * scale, 0.15, 0, Math.PI * 2);
    ctx.ellipse(hx + 7.6 * scale, hy + 1.5 * scale, 3.3 * scale, 5.4 * scale, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'curly') {
    const puffs = [
      [-7.5, -5.5], [-4, -8.5], [0, -9.2], [4, -8.5], [7.5, -5.5],
      [-8.5, 0.5], [8.5, 0.5],
    ];
    puffs.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(hx + px * scale, hy + py * scale, 3.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (hairStyle === 'short') {
    // Swept fringe
    ctx.beginPath();
    ctx.moveTo(hx - 8 * scale, hy - 4 * scale);
    ctx.quadraticCurveTo(hx - 1 * scale, hy - 1 * scale, hx + 6 * scale, hy - 6 * scale);
    ctx.lineTo(hx + 9 * scale, hy - 2 * scale);
    ctx.lineTo(hx - 9 * scale, hy - 2 * scale);
    ctx.closePath();
    ctx.fill();
  }

  // Girl hair bow accessory
  if (!isBoy) {
    ctx.fillStyle = '#ff8fab';
    if (hairStyle === 'twin') {
      ctx.beginPath();
      ctx.arc(hx - 9 * scale, hy - 4.5 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(hx + 9 * scale, hy - 4.5 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(hx + 5.8 * scale, hy - 8.5 * scale, 3.1 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawMourningFlower(ctx, fx, fy, scale = 1, flowerColor = '#f7f5ef') {
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(-0.22);
  // Stem & small leaf (no glow / no light)
  ctx.strokeStyle = '#4e7c58';
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 9 * scale);
  ctx.stroke();
  ctx.fillStyle = '#5a8f65';
  ctx.beginPath();
  ctx.ellipse(2.6 * scale, 5.2 * scale, 2.8 * scale, 1.3 * scale, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // 5-petal mourning blossom
  const petalCol = flowerColor || '#f7f5ef';
  ctx.fillStyle = petalCol;
  ctx.strokeStyle = 'rgba(28, 36, 30, 0.35)';
  ctx.lineWidth = 0.7 * scale;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const px = Math.cos(a) * 3.1 * scale;
    const py = Math.sin(a) * 3.1 * scale;
    ctx.beginPath();
    ctx.arc(px, py, 2.3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#d9b563';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawAvatar2D(ctx, cx, cy, scale, bobOff, cAv, outlineColor = 'rgba(255,255,255,0.45)', atmosphere = 'night') {
  const isBoy = cAv?.gender === 'boy';
  const cloak = cAv?.cloakColor || (isBoy ? '#4a7c59' : '#b86578');
  const style = cAv?.avatarStyle || 'classic';

  ctx.save();
  ctx.translate(cx, cy - bobOff);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 16 * scale + bobOff, 13 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body silhouette (flared for Girl, tailored coat for Boy)
  ctx.fillStyle = cloak;
  ctx.beginPath();
  if (isBoy) {
    const r = 6 * scale;
    const x = -10 * scale;
    const y = -8 * scale;
    const w = 20 * scale;
    const h = 22 * scale;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  } else {
    ctx.moveTo(-8 * scale, -8 * scale);
    ctx.lineTo(8 * scale, -8 * scale);
    ctx.lineTo(13 * scale, 14 * scale);
    ctx.lineTo(-13 * scale, 14 * scale);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.3 * scale;
  ctx.stroke();

  // Outfit Style Accents
  if (style === 'uniform') {
    // Waist belt & brass buttons
    ctx.fillStyle = 'rgba(30, 24, 20, 0.55)';
    ctx.fillRect(-9.5 * scale, 2 * scale, 19 * scale, 3 * scale);
    ctx.fillStyle = '#f5d078';
    ctx.fillRect(-2 * scale, 2 * scale, 4 * scale, 3 * scale);
    ctx.beginPath();
    ctx.arc(0, -3.5 * scale, 1.4 * scale, 0, Math.PI * 2);
    ctx.arc(0, 8 * scale, 1.4 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'cape') {
    // Flowing scarf collar
    ctx.fillStyle = '#ffe5ad';
    ctx.beginPath();
    ctx.ellipse(0, -6.5 * scale, 9 * scale, 3.2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'kimono') {
    // V-collar & obi sash
    ctx.strokeStyle = '#f8f4ea';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-5.5 * scale, -8 * scale);
    ctx.lineTo(0, -1 * scale);
    ctx.lineTo(5.5 * scale, -8 * scale);
    ctx.stroke();
    ctx.fillStyle = '#e5a05d';
    ctx.fillRect(-9.5 * scale, 1 * scale, 19 * scale, 4 * scale);
  } else if (style === 'formal') {
    // White collar & tie/ribbon
    ctx.fillStyle = 'rgba(248, 244, 234, 0.94)';
    ctx.beginPath();
    ctx.moveTo(-5.5 * scale, -8 * scale);
    ctx.lineTo(0, -1.5 * scale);
    ctx.lineTo(5.5 * scale, -8 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = isBoy ? '#2c3e50' : '#e87898';
    ctx.beginPath();
    ctx.arc(0, -3 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (isBoy) {
    // Classic boy collar trim
    ctx.fillStyle = 'rgba(248, 244, 234, 0.92)';
    ctx.beginPath();
    ctx.moveTo(-5.5 * scale, -8 * scale);
    ctx.lineTo(0, -2 * scale);
    ctx.lineTo(5.5 * scale, -8 * scale);
    ctx.closePath();
    ctx.fill();
  }

  // Head & Hair
  drawAvatarHeadAndHair(ctx, 0, -16 * scale, scale, cAv);

  if (cAv?.forceHoldFlower || cAv?.carryingLantern) {
    if (cAv?.forceHoldFlower || atmosphere === 'morning' || atmosphere === 'dusk') {
      const fCol = cAv?.flowerColor || '#f7f5ef';
      if (cAv?.flowerGlowOn && cAv?.flowerColor) {
        const fg = ctx.createRadialGradient(14 * scale, 0, 1, 14 * scale, 0, 14 * scale);
        fg.addColorStop(0, `${fCol}88`);
        fg.addColorStop(1, `${fCol}00`);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(14 * scale, 0, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cAv?.heldFlowerEmoji && cAv.heldFlowerEmoji !== '🌸') {
        ctx.font = `${Math.round(13 * scale)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(cAv.heldFlowerEmoji, 15 * scale, 2 * scale);
      } else {
        drawMourningFlower(ctx, 14 * scale, 0 * scale, scale, fCol);
      }
    } else {
      ctx.font = `${Math.round(13 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🏮', 15 * scale, 2 * scale);
    }
  }

  ctx.restore();
}

export function drawWrappedSpeechBubble(
  ctx,
  anchorX,
  anchorY,
  {
    speaker = '',
    text = '',
    maxWidth = 228,
    viewportWidth = 1200,
    minTop = 8,
    bg = 'rgba(20, 26, 24, 0.94)',
    border = 'rgba(255, 224, 155, 0.7)',
    textColor = '#f9f2e4',
    speakerColor = '#ffd57e',
  } = {}
) {
  if (!text) return;
  ctx.save();

  const textFont = '600 11.5px "Plus Jakarta Sans", sans-serif';
  const speakerFont = '700 10px "Plus Jakarta Sans", sans-serif';
  const padX = 12;
  const padY = 8;
  const lineHeight = 15;
  const maxContentW = Math.max(120, Math.min(maxWidth, viewportWidth - 24) - padX * 2);

  ctx.font = textFont;
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (let i = 0; i < words.length; i += 1) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxContentW || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  if (current) lines.push(current);

  let contentW = 0;
  lines.forEach((ln) => {
    contentW = Math.max(contentW, ctx.measureText(ln).width);
  });
  if (speaker) {
    ctx.font = speakerFont;
    contentW = Math.max(contentW, ctx.measureText(speaker).width);
  }

  const boxW = Math.min(maxWidth, Math.ceil(contentW + padX * 2));
  const speakerH = speaker ? 14 : 0;
  const boxH = padY * 2 + speakerH + lines.length * lineHeight;

  let bx = anchorX - boxW / 2;
  bx = Math.max(8, Math.min(viewportWidth - boxW - 8, bx));
  let by = anchorY - boxH - 8;
  if (by < minTop) by = minTop;

  const r = 10;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + boxW - r, by);
  ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
  ctx.lineTo(bx + boxW, by + boxH - r);
  ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
  ctx.lineTo(bx + r, by + boxH);
  ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();

  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Speech pointer triangle
  const tipX = Math.max(bx + 12, Math.min(bx + boxW - 12, anchorX));
  ctx.beginPath();
  ctx.moveTo(tipX - 5, by + boxH);
  ctx.lineTo(tipX, by + boxH + 6);
  ctx.lineTo(tipX + 5, by + boxH);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();

  const textCenterX = bx + boxW / 2;
  let curY = by + padY;

  if (speaker) {
    ctx.font = speakerFont;
    ctx.fillStyle = speakerColor;
    ctx.textAlign = 'center';
    ctx.fillText(speaker, textCenterX, curY + 9);
    curY += speakerH;
  }

  ctx.font = textFont;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  lines.forEach((ln) => {
    ctx.fillText(ln, textCenterX, curY + 11);
    curY += lineHeight;
  });

  ctx.restore();
}

const petPortraitCache = new Map(); // photoUrl -> { img, loaded, failed }

export function drawCachedPetPortrait(
  ctx,
  photoUrl,
  cx,
  cy,
  radius,
  fallbackEmoji = '🐾',
  borderColor = '#f5e2b8'
) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || radius < 3) return;
  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22, 30, 27, 0.85)';
  ctx.fill();

  let drewImage = false;
  if (photoUrl && typeof Image !== 'undefined') {
    let entry = petPortraitCache.get(photoUrl);
    if (!entry) {
      const img = new Image();
      if (/^https?:/i.test(photoUrl)) {
        img.crossOrigin = 'anonymous';
      }
      entry = { img, loaded: false, failed: false };
      img.onload = () => {
        entry.loaded = true;
      };
      img.onerror = () => {
        entry.failed = true;
      };
      img.src = photoUrl;
      petPortraitCache.set(photoUrl, entry);
    }
    if (entry.loaded && !entry.failed && entry.img.naturalWidth > 0) {
      ctx.save();
      try {
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 1.2, 0, Math.PI * 2);
        ctx.clip();
        const iw = entry.img.naturalWidth;
        const ih = entry.img.naturalHeight;
        const side = Math.min(iw, ih);
        const sx = (iw - side) / 2;
        const sy = (ih - side) / 2;
        ctx.drawImage(entry.img, sx, sy, side, side, cx - radius, cy - radius, radius * 2, radius * 2);
        drewImage = true;
      } catch (_err) {
        entry.failed = true;
        drewImage = false;
      } finally {
        ctx.restore();
      }
    }
  }

  if (!drewImage) {
    ctx.font = `${Math.max(10, Math.round(radius * 1.15))}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fallbackEmoji || '🐾', cx, cy + 1);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1.5, radius * 0.16);
  ctx.stroke();

  ctx.restore();
}
