export const getGlobalAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!(window as any).globalAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    (window as any).globalAudioCtx = new Ctx();
  }
  return (window as any).globalAudioCtx as AudioContext;
};

export const unlockAudioContext = () => {
  const ctx = getGlobalAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};
