// キララの尻尾をゲームと同じく動かす(crystal の Cave3D/KiraraTailRig.cs の TailMotion・KiraraTail.Spine を移した物)。
// <img data-body="尻尾を抜いた体" data-tail="付け根x 付け根y 長さ 太さ 向き(度)"> を、体の後ろに尻尾を描いた canvas に替える。
// 座標は体の絵の画素(y 下向き)。尻尾の絵は同じ場所の kirara_tail.png。data-wag は画面に入った時に振る。触れても振る
(() => {
  const SEGS = 20, U0 = 1480 / 1536, U1 = 60 / 1536, SPINE_V = 530 / 1024, REST = -2;
  // 揺れの大きさ(度)・速さ(rad/秒)・先への遅れ・付け根の振り(度)
  const IDLE = [4, 1.3, .35, 3], WAG = [9, 7, .22, 16];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const load = src => new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = src; });
  const rad = Math.PI / 180;

  document.querySelectorAll("img[data-body]").forEach(async img => {
    const [rx, ry, len, thick, base] = img.dataset.tail.split(" ").map(Number);
    let body, tail;
    try { [body, tail] = await Promise.all([load(img.dataset.body), load(new URL("kirara_tail.png", img.src).href)]); } catch { return; } // 読めなければ元の絵のまま
    const cv = document.createElement("canvas");
    cv.width = body.naturalWidth; cv.height = body.naturalHeight;
    cv.className = img.className; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", img.alt);
    if (!img.alt) cv.setAttribute("aria-hidden", "true");
    img.replaceWith(cv);
    const g = cv.getContext("2d");
    const tw = tail.naturalWidth, th = tail.naturalHeight;
    const sL = len / ((U0 - U1) * tw), sT = sL * thick, seg = len / SEGS;
    const now = IDLE.slice();
    let phase = 0, wagLeft = 0, last = 0, seen = false;

    const draw = () => {
      g.clearRect(0, 0, cv.width, cv.height);
      let a = (base + now[3] * Math.sin(phase)) * rad, x = rx, y = ry;
      for (let i = 0; i < SEGS; i++) {
        a += (REST + now[0] * ((i + 1) / SEGS) * Math.sin(phase - now[2] * i) / (SEGS / 8)) * rad;
        // 節ごとに尻尾の絵の細い帯を、付け根の側から先へ向けて貼る(絵は付け根が右・先が左なので左右を返す)
        const ua = U0 - (U0 - U1) * i / SEGS, ub = U0 - (U0 - U1) * (i + 1) / SEGS;
        g.save(); g.translate(x, y); g.rotate(a); g.scale(-sL, sT);
        const sx = ub * tw, sw = (ua - ub) * tw * (i ? 1.7 : 1); // 曲がりの外側の継ぎ目が開かないよう、付け根側の帯に重ねる
        g.drawImage(tail, sx, 0, sw, th, sx - ua * tw, -SPINE_V * th, sw, th);
        g.restore();
        x += Math.cos(a) * seg; y += Math.sin(a) * seg;
      }
      g.drawImage(body, 0, 0);
    };
    if (still) { draw(); return; }

    const tick = t => {
      const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
      wagLeft -= dt;
      const to = wagLeft > 0 ? WAG : IDLE;
      // 動き出しは 0.2 秒ほど、ふだんへ戻る時は 1 秒ほどかけて収まる
      const k = 1 - Math.exp(-dt * (wagLeft > 0 ? 6 : 1.5));
      for (let i = 0; i < 4; i++) now[i] += (to[i] - now[i]) * k;
      phase += now[1] * dt;
      draw();
      if (seen) requestAnimationFrame(tick);
    };
    const wag = sec => { wagLeft = Math.max(wagLeft, sec); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen) { seen = true; last = 0; requestAnimationFrame(tick); if ("wag" in img.dataset) wag(7); }
      else if (!e.isIntersecting) seen = false;
    }).observe(cv);
    cv.addEventListener("pointerenter", () => wag(2.5));
    cv.addEventListener("click", () => wag(2.5));
    draw();
  });
})();
