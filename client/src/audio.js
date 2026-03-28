let bgmCtx = null;
window.bgmTimer = null;
window.isBgmOn = false;

export const ensureAudioContext = () => {
    if (!bgmCtx) { bgmCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (bgmCtx.state === 'suspended') bgmCtx.resume();
    return bgmCtx;
};

export const toggleBGM = (isOn) => {
    window.isBgmOn = isOn;
    if (!isOn) { if (window.bgmTimer) { clearInterval(window.bgmTimer); window.bgmTimer = null; } return; }
    if (window.bgmTimer) return;
    try {
        const ctx = ensureAudioContext();
        const chords = [ [146.83, 174.61, 220.00, 293.66], [130.81, 164.81, 196.00, 261.63], [116.54, 146.83, 174.61, 233.08], [110.00, 138.59, 164.81, 220.00] ];
        let step = 0;
        const playBeat = () => {
            if (ctx.state === 'suspended') return;
            const t = ctx.currentTime + 0.05; const chordIdx = Math.floor(step / 16) % chords.length; const chord = chords[chordIdx];
            if (step % 4 === 0 || step % 4 === 3) {
                const bOsc = ctx.createOscillator(); const bGain = ctx.createGain(); bOsc.type = 'sawtooth'; bOsc.frequency.value = chord[0] / 2; bOsc.connect(bGain); bGain.connect(ctx.destination);
                bGain.gain.setValueAtTime(0.2, t); bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25); bOsc.start(t); bOsc.stop(t + 0.25);
            }
            if (step % 2 !== 0 || Math.random() > 0.3) {
                const mOsc = ctx.createOscillator(); const mGain = ctx.createGain(); mOsc.type = 'square'; mOsc.frequency.value = chord[Math.floor(Math.random() * chord.length)] * (Math.random() > 0.5 ? 2 : 1);
                mOsc.connect(mGain); mGain.connect(ctx.destination); mGain.gain.setValueAtTime(0.08, t); mGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1); mOsc.start(t); mOsc.stop(t + 0.1);
            }
            step++;
        };
        window.bgmTimer = setInterval(playBeat, 110);
    } catch(e) {}
};

export const playSFX = (type) => {
    if (window.isBgmOn && bgmCtx && bgmCtx.state === 'suspended') bgmCtx.resume();
    if (localStorage.getItem('tactical_sfx') === 'off') return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); if(!ctx) return;
        const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'hit') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1); osc.start(); osc.stop(ctx.currentTime + 0.1); }
        else if (type === 'heal') { osc.type = 'sine'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); }
        else if (type === 'select') { osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05); osc.start(); osc.stop(ctx.currentTime + 0.05); }
        else if (type === 'error') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(); osc.stop(ctx.currentTime + 0.2); }
        else if (type === 'gacha_flip') { osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); }
        else if (type === 'gacha_5star') { osc.type = 'square'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5); gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1); osc.start(); osc.stop(ctx.currentTime + 1); }
        else if (type === 'emote') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2); gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); osc.start(); osc.stop(ctx.currentTime + 0.3); }
    } catch(e) {}
};

export { bgmCtx };
