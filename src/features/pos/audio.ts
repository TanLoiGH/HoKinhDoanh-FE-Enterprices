export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const firstOscillator = ctx.createOscillator();
    const firstGain = ctx.createGain();
    firstOscillator.connect(firstGain);
    firstGain.connect(ctx.destination);
    firstOscillator.frequency.setValueAtTime(659.25, ctx.currentTime);
    firstGain.gain.setValueAtTime(0.15, ctx.currentTime);
    firstGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    firstOscillator.start(ctx.currentTime);
    firstOscillator.stop(ctx.currentTime + 0.15);

    const secondOscillator = ctx.createOscillator();
    const secondGain = ctx.createGain();
    secondOscillator.connect(secondGain);
    secondGain.connect(ctx.destination);
    secondOscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    secondGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    secondGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    secondOscillator.start(ctx.currentTime + 0.1);
    secondOscillator.stop(ctx.currentTime + 0.35);
  } catch (error) {
    console.warn("Chime audio error:", error);
  }
};
