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

export function drawAvatar2D(ctx, cx, cy, scale, bobOff, cAv, outlineColor = 'rgba(255,255,255,0.45)') {
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

  if (cAv?.carryingLantern) {
    ctx.font = `${Math.round(13 * scale)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏮', 15 * scale, 2 * scale);
  }

  ctx.restore();
}
