export function flyCard(
  fromRect: DOMRect | null,
  toRect: DOMRect | null,
  src: string,
  options?: { spin?: number; delay?: number; duration?: number }
) {
  if (!fromRect || !toRect) return;
  const w = 72;
  const h = (w * 4) / 3;
  const img = document.createElement('img');
  img.src = src;
  img.style.position = 'fixed';
  img.style.zIndex = '999';
  img.style.pointerEvents = 'none';
  img.style.borderRadius = '7px';
  img.style.boxShadow = '0 6px 14px rgba(0,0,0,0.6)';
  img.style.left = '0';
  img.style.top = '0';
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.opacity = '0';
  document.body.appendChild(img);

  const fx = fromRect.left + fromRect.width / 2 - w / 2;
  const fy = fromRect.top + fromRect.height / 2 - h / 2;
  const tx = toRect.left + toRect.width / 2 - w / 2;
  const ty = toRect.top + toRect.height / 2 - h / 2;
  const mx = (fx + tx) / 2;
  const my = (fy + ty) / 2 - 45; // parabolic arc rise in air
  const spin = options?.spin !== undefined ? options.spin : (Math.random() > 0.5 ? 12 : -12);

  const anim = img.animate(
    [
      { transform: `translate(${fx}px, ${fy}px) rotate(0deg) scale(0.9)`, opacity: 1, offset: 0 },
      { transform: `translate(${mx}px, ${my}px) rotate(${spin / 2}deg) scale(1.05)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${tx}px, ${ty}px) rotate(${spin}deg) scale(1)`, opacity: 1, offset: 1 },
    ],
    {
      duration: options?.duration ?? 430,
      delay: options?.delay ?? 0,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      fill: 'both',
    }
  );

  anim.onfinish = () => {
    img.remove();
  };
}
