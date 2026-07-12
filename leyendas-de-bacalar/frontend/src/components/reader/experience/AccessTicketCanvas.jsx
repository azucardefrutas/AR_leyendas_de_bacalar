import React, { useEffect, useRef } from 'react';

// Canvas-rendered "Pase a la leyenda" access ticket, themed to the Bacalar
// lagoon (7 colors, pirate compass, cenote waters). It draws its own idle
// float, a magic scanner while validating, a physics-based tear on an invalid
// code, and a stamp + confetti burst on success.
//
// Unlike the original standalone demo (which checked a hardcoded code), this
// calls the real redeem flow via onValidate(code) -> { error }. The magic scan
// runs while that promise is pending. Respects prefers-reduced-motion.
function AccessTicketCanvas({ onValidate, onSuccess }) {
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const onValidateRef = useRef(onValidate);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onValidateRef.current = onValidate;
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const input = inputRef.current;
    const wrapper = wrapRef.current;
    const DPR = window.devicePixelRatio || 1;
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvasHeight = 440;
    let canvasWidth = 0;
    let raf = 0;

    const colors = {
      textSecondary: '#67e8f9',
      btnBg: '#0891b2',
      btnBgHover: '#06b6d4',
      btnText: '#ffffff',
      success: '#10b981',
      error: '#ef4444',
      ticketBorder: '#0e7490',
      ticketBorderFocus: '#22d3ee',
      ticketAccent: '#facc15',
    };

    const S = {
      appState: 'IDLE',
      currentCode: '',
      isFocused: false,
      hoverButton: false,
      tick: 0,
      particles: [],
      left: null,
      right: null,
      jagged: [],
      newTicketY: 300,
      stampScale: 4,
      stampAlpha: 0,
      errorMsg: '',
    };

    const ui = { button: { x: 0, y: 0, w: 0, h: 0, radius: 24 } };

    function resizeCanvas() {
      canvasWidth = wrapper.clientWidth;
      canvas.width = canvasWidth * DPR;
      canvas.height = canvasHeight * DPR;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
      canvas.style.height = `${canvasHeight}px`;
    }

    function pointer(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const x = cx - rect.left;
      const y = cy - rect.top;

      if (S.appState === 'IDLE') {
        if (y < ui.button.y - 20) {
          input.focus();
          S.isFocused = true;
          input.setSelectionRange(S.currentCode.length, S.currentCode.length);
        } else {
          input.blur();
          S.isFocused = false;
        }
      }
      const inButton = ui.button.w > 0
        && x >= ui.button.x && x <= ui.button.x + ui.button.w
        && y >= ui.button.y && y <= ui.button.y + ui.button.h;
      if (S.appState === 'ERROR' && inButton) {
        resetForRetry();
      } else if (S.appState === 'IDLE' && S.currentCode.length > 0 && inButton) {
        startValidation();
      }
      if (S.appState === 'SUCCESS') {
        S.appState = 'RESETTING';
        S.newTicketY = 300;
        S.currentCode = '';
        input.value = '';
      }
    }

    function move(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const overBtn = x >= ui.button.x && x <= ui.button.x + ui.button.w && y >= ui.button.y && y <= ui.button.y + ui.button.h;
      S.hoverButton = overBtn;
      if (overBtn && (S.currentCode.length > 0 || S.appState === 'ERROR')) canvas.style.cursor = 'pointer';
      else if (y < ui.button.y - 20 && S.appState === 'IDLE') canvas.style.cursor = 'text';
      else canvas.style.cursor = 'default';
    }

    function onBlur() { S.isFocused = false; }

    function onInput(e) {
      if (S.appState === 'LOADING' || S.appState === 'SUCCESS' || S.appState === 'RESETTING') return;
      // Sin reformatear: el codigo real es PREFIJO-XXXX-XXXXX (largo variable). Solo
      // dejamos mayusculas, alfanumericos y guiones; el backend normaliza y valida.
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (val.length > 24) val = val.slice(0, 24);
      S.currentCode = val;
      e.target.value = val;
      if (S.appState === 'ERROR') resetTicket();
    }

    function onKeydown(e) {
      if (e.key === 'Enter' && S.currentCode.length > 0 && (S.appState === 'IDLE' || S.appState === 'ERROR')) {
        startValidation();
      }
    }

    async function startValidation() {
      input.blur();
      S.isFocused = false;
      S.appState = 'LOADING';
      const code = S.currentCode;
      const settle = new Promise((resolve) => { setTimeout(resolve, REDUCED ? 0 : 1200); });
      let result = { error: new Error('No se pudo validar el código.') };
      try {
        const [res] = await Promise.all([onValidateRef.current(code), settle]);
        result = res || { error: null };
      } catch (err) {
        result = { error: err };
      }
      if (result.error) {
        S.errorMsg = friendlyError(result.error);
        triggerError();
      } else {
        triggerSuccess();
        onSuccessRef.current?.();
      }
    }

    function triggerSuccess() {
      S.appState = 'SUCCESS';
      S.stampScale = 4;
      S.stampAlpha = 0;
      S.particles = [];
      if (REDUCED) { S.stampScale = 1; S.stampAlpha = 1; return; }
      const palette = ['#22d3ee', '#06b6d4', '#facc15', '#fef08a', '#ffffff', '#10b981'];
      for (let i = 0; i < 100; i += 1) {
        S.particles.push({
          x: canvasWidth / 2, y: canvasHeight / 2 - 50,
          vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12 - 4,
          rotation: Math.random() * 360, rv: (Math.random() - 0.5) * 5,
          life: 1, color: palette[Math.floor(Math.random() * palette.length)],
          size: Math.random() * 8 + 4, type: Math.random() > 0.5 ? 'square' : 'circle',
        });
      }
    }

    function triggerError() {
      S.appState = 'ERROR';
      if (REDUCED) { S.left = null; S.right = null; return; }
      const tW = Math.min(420, canvasWidth - 40);
      const tH = 190;
      S.jagged = [];
      let y = 0;
      S.jagged.push({ x: tW / 2, y });
      while (y < tH) {
        y += Math.random() * 15 + 10;
        const x = (tW / 2) + (Math.random() - 0.5) * 35;
        if (y > tH) y = tH;
        S.jagged.push({ x, y });
      }
      S.left = { x: 0, y: 0, vx: -1.5 - Math.random(), vy: -2 - Math.random() * 1.5, va: -0.01 - Math.random() * 0.015, angle: 0 };
      S.right = { x: 0, y: 0, vx: 1.5 + Math.random(), vy: -2 - Math.random() * 1.5, va: 0.01 + Math.random() * 0.015, angle: 0 };
    }

    function resetTicket() {
      S.appState = 'RESETTING';
      S.newTicketY = 300;
      S.left = null;
      S.right = null;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    // Nunca mostramos detalles tecnicos (URLs de la API, "backend", red). Solo mensajes
    // claros para el lector.
    function friendlyError(err) {
      const msg = err?.message || '';
      if (!msg || /https?:|www\.|backend|\bapi\b|url|fetch|network|conect|servidor|\b40\d\b|\b50\d\b/i.test(msg)) {
        return 'No pudimos validar el codigo. Intenta de nuevo.';
      }
      if (/inv[aá]lid|incorrect|no existe|no encontr/i.test(msg)) {
        return 'Codigo incorrecto. Intenta de nuevo.';
      }
      return msg;
    }

    // Limpia el ticket para reintentar tras un error (boton Reintentar).
    function resetForRetry() {
      S.currentCode = '';
      input.value = '';
      S.errorMsg = '';
      resetTicket();
      input.focus();
      S.isFocused = true;
    }

    function drawCheckIcon(cx, cy, size, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - size, cy + size * 0.1);
      ctx.lineTo(cx - size * 0.25, cy + size * 0.8);
      ctx.lineTo(cx + size, cy - size * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    function drawRetryIcon(cx, cy, size, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, size, Math.PI * 0.55, Math.PI * 2.15);
      ctx.stroke();
      const a = Math.PI * 0.55;
      const sx = cx + Math.cos(a) * size;
      const sy = cy + Math.sin(a) * size;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 6, sy - 1);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 1, sy - 7);
      ctx.stroke();
      ctx.restore();
    }

    function updatePhysics() {
      if (S.appState === 'SUCCESS') {
        if (S.stampScale > 1) S.stampScale -= (S.stampScale - 1) * 0.08;
        if (S.stampAlpha < 1) S.stampAlpha += 0.03;
      } else if (S.appState === 'ERROR' && S.left && S.right) {
        [S.left, S.right].forEach((p) => {
          p.vy += 0.12; p.vx *= 0.98; p.vy *= 0.98;
          p.x += p.vx; p.y += p.vy; p.angle += p.va;
        });
      } else if (S.appState === 'RESETTING') {
        S.newTicketY += (0 - S.newTicketY) * 0.06;
        if (Math.abs(S.newTicketY) < 0.5) {
          S.newTicketY = 0;
          S.appState = 'IDLE';
          if (S.isFocused) input.focus();
        }
      }
      for (let i = S.particles.length - 1; i >= 0; i -= 1) {
        const p = S.particles[i];
        if (p.life > 0) {
          p.vy += 0.08; p.vx *= 0.98; p.vy *= 0.99;
          p.x += p.vx; p.y += p.vy; p.rotation += p.rv; p.life -= 0.003;
        } else {
          S.particles.splice(i, 1);
        }
      }
    }

    function drawSingleTicket(x, y, w, h) {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      const shine = REDUCED ? 0 : Math.sin(S.tick * 0.015) * 0.15;
      if (S.isFocused && S.appState === 'IDLE') {
        grad.addColorStop(0, '#0a3d4c'); grad.addColorStop(0.5 + shine, '#062d38'); grad.addColorStop(1, '#031c24');
      } else {
        grad.addColorStop(0, '#073340'); grad.addColorStop(0.5 + shine, '#04222b'); grad.addColorStop(1, '#021117');
      }
      ctx.fillStyle = grad;

      const r = 12;
      const cut = 18;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h / 2 - cut);
      ctx.arc(x + w, y + h / 2, cut, 1.5 * Math.PI, 0.5 * Math.PI, true);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + h / 2 + cut);
      ctx.arc(x, y + h / 2, cut, 0.5 * Math.PI, 1.5 * Math.PI, true);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = (S.isFocused && S.appState === 'IDLE') ? colors.ticketBorderFocus : colors.ticketBorder;
      ctx.lineWidth = (S.isFocused && S.appState === 'IDLE') ? 2 : 1;
      ctx.stroke();

      // Pirate-compass hologram (slow rotation)
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(REDUCED ? 0 : S.tick * 0.0015);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.06)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -65); ctx.lineTo(12, -15); ctx.lineTo(0, 0); ctx.lineTo(-12, -15);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Cenote water waves at the base (7-colors lagoon)
      if (!REDUCED) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        for (let i = 0; i <= w; i += 10) {
          const wy = y + h - 12 + Math.sin(i * 0.03 + S.tick * 0.04) * 5;
          ctx.lineTo(x + Math.max(r, Math.min(w - r, i)), wy);
        }
        ctx.lineTo(x + w, y + h);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        for (let i = 0; i <= w; i += 10) {
          const wy = y + h - 6 + Math.cos(i * 0.04 + S.tick * 0.03) * 4;
          ctx.lineTo(x + Math.max(r, Math.min(w - r, i)), wy);
        }
        ctx.lineTo(x + w, y + h);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.fill();
        ctx.restore();
      }

      // Title
      ctx.fillStyle = colors.ticketAccent;
      ctx.font = '600 13px "DM Serif Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillText('PASE A LA LEYENDA', x + w / 2, y + 34);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
      ctx.fillRect(x + 40, y + 30, w / 2 - 110, 1);
      ctx.fillRect(x + w / 2 + 70, y + 30, w / 2 - 110, 1);

      ctx.fillStyle = 'rgba(103, 232, 249, 0.55)';
      ctx.font = '600 9px "Space Mono", monospace';
      ctx.letterSpacing = '3px';
      ctx.fillText('LEYENDAS DE BACALAR · EDICIÓN FÍSICA', x + w / 2, y + 50);

      // Code entry zone
      const textY = y + h / 2 + 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      roundRect(x + 40, y + h / 2 - 25, w - 80, 46, 8);
      ctx.fill();

      if (S.currentCode.length === 0 && !S.isFocused) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '500 16px "Space Mono", monospace';
        ctx.letterSpacing = '1px';
        ctx.textAlign = 'center';
        ctx.fillText('INGRESA TU CODIGO', x + w / 2, textY);
      } else {
        // Muestra el codigo tal cual (largo variable). Se auto-ajusta el tamano para que
        // un codigo completo (PREFIJO-XXXX-XXXXX) quepa en el ticket.
        const boxW = w - 96;
        let fontSize = 30;
        ctx.letterSpacing = '3px';
        ctx.font = `bold ${fontSize}px "Space Mono", monospace`;
        while (ctx.measureText(S.currentCode).width > boxW && fontSize > 12) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px "Space Mono", monospace`;
        }
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(S.currentCode, x + w / 2, textY);
        ctx.shadowBlur = 0;
        if (S.isFocused && S.appState === 'IDLE' && Math.floor(Date.now() / 500) % 2 === 0) {
          const half = ctx.measureText(S.currentCode).width / 2;
          ctx.fillStyle = colors.ticketAccent;
          ctx.fillRect(x + w / 2 + half + 4, textY - fontSize * 0.72, 3, fontSize * 0.9);
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('Nº 07C · BACALAR · MX', x + w / 2, y + h - 26);

      // Magic scanner while validating
      if (S.appState === 'LOADING' && !REDUCED) {
        const prog = (Math.sin(S.tick * 0.04) + 1) / 2;
        const sY = y + 20 + prog * (h - 40);
        ctx.shadowColor = colors.ticketAccent; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 15, sY - 1, w - 30, 2);
        const g = ctx.createLinearGradient(0, sY - 40, 0, sY + 40);
        g.addColorStop(0, 'rgba(250, 204, 21, 0)');
        g.addColorStop(0.5, 'rgba(34, 211, 238, 0.5)');
        g.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = g; ctx.fillRect(x + 20, sY - 40, w - 40, 80);
        ctx.shadowBlur = 0;
      }

      // Success stamp
      if (S.appState === 'SUCCESS') {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(-0.15);
        ctx.scale(S.stampScale, S.stampScale);
        ctx.globalAlpha = S.stampAlpha;
        ctx.strokeStyle = colors.success; ctx.lineWidth = 6;
        const sW = 210; const sH = 60; const sR = 10;
        ctx.beginPath();
        ctx.moveTo(-sW / 2 + sR, -sH / 2);
        ctx.lineTo(sW / 2 - sR, -sH / 2);
        ctx.quadraticCurveTo(sW / 2, -sH / 2, sW / 2, -sH / 2 + sR);
        ctx.lineTo(sW / 2, sH / 2 - sR);
        ctx.quadraticCurveTo(sW / 2, sH / 2, sW / 2 - sR, sH / 2);
        ctx.lineTo(-sW / 2 + sR, sH / 2);
        ctx.quadraticCurveTo(-sW / 2, sH / 2, -sW / 2, sH / 2 - sR);
        ctx.lineTo(-sW / 2, -sH / 2 + sR);
        ctx.quadraticCurveTo(-sW / 2, -sH / 2, -sW / 2 + sR, -sH / 2);
        ctx.stroke();
        ctx.fillStyle = colors.success;
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '1px';
        ctx.fillText('LEYENDA DESBLOQUEADA', 0, 2);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
      }
    }

    function drawTicketZone() {
      const tW = Math.min(420, canvasWidth - 40);
      const tH = 190;
      const cx = canvasWidth / 2;
      const tX = cx - tW / 2;
      const baseY = 44;

      if (S.appState === 'ERROR' && S.left) {
        [['left', tX], ['right', tX + tW]].forEach(([key, edgeX]) => {
          const piece = S[key];
          ctx.save();
          ctx.translate(tX + tW / 2 + piece.x, baseY + tH / 2 + piece.y);
          ctx.rotate(piece.angle);
          ctx.translate(-(tX + tW / 2), -(baseY + tH / 2));
          ctx.beginPath();
          ctx.moveTo(edgeX, baseY);
          ctx.lineTo(tX + S.jagged[0].x, baseY + S.jagged[0].y);
          S.jagged.forEach((pt) => ctx.lineTo(tX + pt.x, baseY + pt.y));
          ctx.lineTo(edgeX, baseY + tH);
          ctx.closePath();
          ctx.clip();
          drawSingleTicket(tX, baseY, tW, tH);
          ctx.restore();
        });
      } else {
        const hover = (S.appState === 'IDLE' && !S.isFocused && !REDUCED) ? Math.sin(S.tick * 0.03) * 3 : 0;
        let finalY = baseY + hover;
        if (S.appState === 'RESETTING') finalY = baseY + S.newTicketY;
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 25; ctx.shadowOffsetY = 15;
        drawSingleTicket(tX, finalY, tW, tH);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      }
    }

    function drawControls() {
      const cy = canvasHeight - 96;
      if (S.appState === 'ERROR') {
        ctx.fillStyle = colors.error;
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = REDUCED ? 1 : 0.7 + Math.sin(S.tick * 0.1) * 0.3;
        ctx.fillText(S.errorMsg || 'Codigo incorrecto. Intenta de nuevo.', canvasWidth / 2, cy - 4);
        ctx.globalAlpha = 1;

        // Boton Reintentar (icono de flecha circular).
        ui.button.w = 170; ui.button.h = 48;
        ui.button.x = canvasWidth / 2 - ui.button.w / 2;
        ui.button.y = cy + 16;
        ctx.fillStyle = S.hoverButton ? colors.btnBgHover : colors.btnBg;
        roundRect(ui.button.x, ui.button.y, ui.button.w, ui.button.h, ui.button.radius); ctx.fill();
        const rLabel = 'Reintentar';
        ctx.font = 'bold 15px Inter, sans-serif';
        const rtw = ctx.measureText(rLabel).width;
        const rgx = canvasWidth / 2 - (rtw + 28) / 2;
        drawRetryIcon(rgx + 9, ui.button.y + ui.button.h / 2, 9, colors.btnText);
        ctx.fillStyle = colors.btnText;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(rLabel, rgx + 28, ui.button.y + ui.button.h / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      } else if (S.appState === 'SUCCESS') {
        ctx.fillStyle = colors.success;
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('¡El cenote revela sus secretos!', canvasWidth / 2, cy + 12);
        ctx.fillStyle = colors.textSecondary;
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Ya está en tu biblioteca · toca para canjear otro', canvasWidth / 2, cy + 38);
        ui.button.w = 0;
      } else {
        ui.button.w = 190; ui.button.h = 50;
        ui.button.x = canvasWidth / 2 - ui.button.w / 2;
        ui.button.y = cy;
        if (S.appState === 'LOADING') {
          ctx.fillStyle = colors.btnBg; ctx.globalAlpha = 0.6;
          roundRect(ui.button.x, ui.button.y, ui.button.w, ui.button.h, ui.button.radius); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = colors.btnText; ctx.font = 'bold 16px Inter, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const n = S.tick % 45 < 15 ? '.' : S.tick % 45 < 30 ? '..' : '...';
          ctx.fillText(`Explorando${n}`, canvasWidth / 2, ui.button.y + ui.button.h / 2);
          ctx.textBaseline = 'alphabetic';
        } else {
          const active = S.currentCode.length > 0;
          ctx.globalAlpha = active ? 1 : 0.35;
          ctx.fillStyle = (S.hoverButton && active) ? colors.btnBgHover : colors.btnBg;
          roundRect(ui.button.x, ui.button.y, ui.button.w, ui.button.h, ui.button.radius); ctx.fill();
          // Icono de aceptar (check) + etiqueta.
          const label = 'Revelar secreto';
          ctx.font = 'bold 15px Inter, sans-serif';
          const tw = ctx.measureText(label).width;
          const gx = canvasWidth / 2 - (tw + 28) / 2;
          drawCheckIcon(gx + 8, ui.button.y + ui.button.h / 2, 8, colors.btnText);
          ctx.fillStyle = colors.btnText;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(label, gx + 26, ui.button.y + ui.button.h / 2);
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          ctx.globalAlpha = 1;
        }
      }
    }

    function drawParticles() {
      S.particles.forEach((p) => {
        if (p.life <= 0) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.type === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
    }

    function frame() {
      S.tick += 1;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      updatePhysics();
      drawTicketZone();
      drawControls();
      drawParticles();
      raf = window.requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', pointer);
    canvas.addEventListener('touchstart', pointer, { passive: false });
    canvas.addEventListener('mousemove', move);
    input.addEventListener('blur', onBlur);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    frame();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousedown', pointer);
      canvas.removeEventListener('touchstart', pointer);
      canvas.removeEventListener('mousemove', move);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return (
    <div className="rx-ticket-canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="Boleto de acceso: ingresa el código de tu edición física" />
      <input
        ref={inputRef}
        className="rx-ticket-hidden-input"
        type="text"
        maxLength={24}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
        aria-label="Código de activación"
      />
    </div>
  );
}

export default AccessTicketCanvas;
