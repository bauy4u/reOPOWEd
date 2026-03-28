import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import socket from '../socket';
import I18N from '../i18n';
import { playSFX } from '../audio';
import { IconCart, IconStar } from '../components/Icons';

const createCircleTexture = () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.8)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(canvas);
};

const createTextSprite = (text) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64; const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,256,64); ctx.font = 'bold 28px "Noto Sans SC", sans-serif'; ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas); const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(mat); sprite.scale.set(100, 25, 1); return sprite;
};

const WarpScreen = ({ user, onClose, lang }) => {
    const t = I18N[lang];
    const containerRef = useRef(null);
    const [step, setStep] = useState('menu');
    const [pullCount, setPullCount] = useState(1);
    const [drops, setDrops] = useState([]);
    const [revealIdx, setRevealIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);

    const threeState = useRef({ scene:null, camera:null, renderer:null, reqId:null, raycaster:new THREE.Raycaster(), mouse:new THREE.Vector2(), hitboxes:[], burstingGroup:null, burstStart:0 });
    const stepRef = useRef(step); useEffect(() => { stepRef.current = step; }, [step]);
    const maxRarityRef = useRef(3);

    const doPull = (count) => {
        socket.emit('gacha_pull', count, (res) => {
            if (res.err) return playSFX('error');
            maxRarityRef.current = Math.max(...res.drops.map(r=>r.rarity));
            setPullCount(count); setDrops(res.drops); setStep('sky'); playSFX('select');
        });
    };

    useEffect(() => {
        if(!containerRef.current || step !== 'sky') return;
        containerRef.current.innerHTML = '';

        const w = window.innerWidth; const h = window.innerHeight;
        const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x000000, 0.0015);
        const camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 2500);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(w, h); containerRef.current.appendChild(renderer.domElement);

        const circleTex = createCircleTexture();
        const geo = new THREE.BufferGeometry(); const pos = [];
        for(let i=0; i<1000; i++){ pos.push((Math.random()-0.5)*2000, (Math.random()-0.5)*2000, (Math.random()-0.5)*2000); }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ size: 6, map: circleTex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
        const starSys = new THREE.Points(geo, mat); scene.add(starSys);

        const constelNames = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
        const hitboxes = [];

        for(let i=0; i<12; i++) {
            const group = new THREE.Group();
            const phi = Math.acos(-1 + (2*i)/12); const theta = Math.sqrt(12*Math.PI)*phi;
            const r = 600; const cx = r * Math.cos(theta) * Math.sin(phi); const cy = r * Math.sin(theta) * Math.sin(phi); const cz = r * Math.cos(phi);
            group.position.set(cx, cy, cz); group.lookAt(0,0,0);

            const numStars = 3 + Math.floor(Math.random()*3); const starPoints = [];
            for(let j=0; j<numStars; j++) {
                const sx = (Math.random()-0.5)*120; const sy = (Math.random()-0.5)*120; const sz = (Math.random()-0.5)*20;
                starPoints.push(new THREE.Vector3(sx, sy, sz));
                const sMat = new THREE.SpriteMaterial({ map: circleTex, color: 0x00f0ff, transparent: true, blending: THREE.AdditiveBlending });
                const sprite = new THREE.Sprite(sMat); sprite.position.set(sx, sy, sz); sprite.scale.set(15, 15, 1);
                group.add(sprite);
            }

            const lineGeo = new THREE.BufferGeometry().setFromPoints(starPoints);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
            const line = new THREE.Line(lineGeo, lineMat); group.add(line);
            const nameSprite = createTextSprite(constelNames[i]); nameSprite.position.set(0, -70, 0); group.add(nameSprite);

            const boxGeo = new THREE.BoxGeometry(180, 180, 50); const boxMat = new THREE.MeshBasicMaterial({visible: false});
            const hitbox = new THREE.Mesh(boxGeo, boxMat); group.add(hitbox); hitboxes.push(hitbox);
            hitbox.userData = { parentGroup: group }; scene.add(group);
        }

        let lon = 0, lat = 0, isDragging = false, startX, startY, startLon, startLat;

        const onDown = (e) => {
            if(stepRef.current!=='sky') return;
            isDragging = true;
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            startY = e.clientY || (e.touches && e.touches[0].clientY);
            startLon = lon; startLat = lat;
        };
        const onMove = (e) => {
            const cx = e.clientX || (e.touches && e.touches[0].clientX);
            const cy = e.clientY || (e.touches && e.touches[0].clientY);
            threeState.current.mouse.x = (cx/w)*2-1; threeState.current.mouse.y = -(cy/h)*2+1;
            if(isDragging){ lon = (startX - cx)*0.15 + startLon; lat = (cy - startY)*0.15 + startLat; }
        };
        const onUp = (e) => {
            isDragging = false; if(stepRef.current!=='sky' || threeState.current.burstingGroup) return;
            const cx = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
            const cy = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
            if(Math.abs(cx - startX) < 10 && Math.abs(cy - startY) < 10){
                threeState.current.raycaster.setFromCamera(threeState.current.mouse, camera);
                const intersects = threeState.current.raycaster.intersectObjects(hitboxes);
                if(intersects.length > 0){
                    if(threeState.current.burstingGroup) {
                        threeState.current.burstingGroup.scale.set(1,1,1);
                        threeState.current.burstingGroup.children.forEach(c => { if(c.material && c.material.color) c.material.color.setHex(0x00f0ff); });
                    }
                    threeState.current.burstingGroup = intersects[0].object.userData.parentGroup;
                    threeState.current.burstStart = Date.now();
                    playSFX('select');

                    setTimeout(() => {
                        setStep('reveal'); setRevealIdx(0); setFlipped(false); setIsFlipping(false);
                    }, 1500);
                }
            }
        };

        window.addEventListener('mousedown', onDown); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        window.addEventListener('touchstart', onDown); window.addEventListener('touchmove', onMove); window.addEventListener('touchend', onUp);

        const animate = () => {
            lat = Math.max(-85, Math.min(85, lat));
            const phi2 = THREE.MathUtils.degToRad(90 - lat); const theta2 = THREE.MathUtils.degToRad(lon);
            camera.target = new THREE.Vector3( 500*Math.sin(phi2)*Math.cos(theta2), 500*Math.cos(phi2), 500*Math.sin(phi2)*Math.sin(theta2) );
            camera.lookAt(camera.target);

            if (threeState.current.burstingGroup) {
                const elapsed = Date.now() - threeState.current.burstStart; const prog = Math.min(elapsed / 1500, 1);
                const scale = 1 + Math.sin(prog * Math.PI) * 0.3;
                threeState.current.burstingGroup.scale.set(scale, scale, scale);

                const maxR = maxRarityRef.current;
                const cHex = maxR === 5 ? 0xffd700 : maxR === 4 ? 0x8a2be2 : 0x00f0ff;
                threeState.current.burstingGroup.children.forEach(c => { if(c.material && c.material.color) c.material.color.setHex(cHex); });
            }

            renderer.render(scene, camera);
            threeState.current.reqId = requestAnimationFrame(animate);
        };
        animate();
        threeState.current.renderer = renderer;

        return () => {
            cancelAnimationFrame(threeState.current.reqId);
            window.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchstart', onDown); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
            if(threeState.current.renderer) threeState.current.renderer.dispose();
            if(containerRef.current) containerRef.current.innerHTML = '';
            threeState.current.burstingGroup = null;
        };
    }, [step]);

    const handleCardClick = () => {
        if (step !== 'reveal' || isFlipping) return;
        if (!flipped) {
            setIsFlipping(true); setFlipped(true); playSFX('gacha_flip');
            if(drops[revealIdx].rarity === 5) setTimeout(()=>playSFX('gacha_5star'), 300);
            setTimeout(() => setIsFlipping(false), 600);
        } else {
            if (revealIdx < drops.length - 1) {
                setIsFlipping(true); setFlipped(false);
                setTimeout(() => setRevealIdx(prev => prev + 1), 300);
                setTimeout(() => setIsFlipping(false), 600);
            }
            else { setStep('summary'); playSFX('select'); }
        }
    };

    const getRarityColor = (r) => r===5 ? '#ffd700' : r===4 ? '#8a2be2' : '#00f0ff';
    const getRarityName = (r) => r===5 ? 'LEGENDARY' : r===4 ? 'EPIC' : 'RARE';

    return (
        <div className="fixed inset-0 z-[100] bg-black font-sans text-white">
            <div ref={containerRef} className={`absolute inset-0 ${step === 'sky' ? 'cursor-move z-10' : 'hidden z-0'}`}></div>

            {step === 'sky' && <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 font-mono text-brand-cyan tracking-widest animate-pulse pointer-events-none bg-black/50 px-6 py-2 rounded-full border border-brand-cyan/30 z-20 shadow-[0_0_15px_#00f0ff]">{t.warp_click_star}</div>}

            {step === 'menu' && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in z-20 overflow-y-auto">
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 text-brand-gold font-mono font-bold flex items-center gap-2"><IconCart/> {user.economy.credits} CR</div>
                    <button onClick={onClose} className="absolute top-4 left-4 md:top-8 md:left-8 text-gray-400 hover:text-white text-3xl">&times;</button>
                    <h1 className="text-3xl md:text-5xl font-black text-brand-cyan tracking-[0.2em] mb-4 drop-shadow-[0_0_20px_rgba(0,240,255,0.5)] text-center">{t.warp_title}</h1>
                    <p className="text-gray-400 font-mono mb-12 text-center text-sm px-4">{t.warp_desc}</p>
                    <div className="flex flex-col md:flex-row gap-8 items-center w-full px-4 justify-center">
                        <button onClick={()=>doPull(1)} className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 hover:border-brand-cyan/50 hover:bg-brand-cyan/5 transition group w-full md:w-64 max-w-[250px]">
                            <IconStar className="w-10 h-10 md:w-12 md:h-12 text-brand-cyan group-hover:scale-110 transition" />
                            <span className="font-bold tracking-widest">{t.warp_1}</span>
                        </button>
                        <button onClick={()=>doPull(10)} className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col items-center gap-4 border-brand-purple/30 hover:border-brand-purple hover:bg-brand-purple/10 transition group w-full md:w-64 max-w-[250px] shadow-[0_0_30px_rgba(138,43,226,0.2)]">
                            <div className="flex gap-1"><IconStar className="w-6 h-6 md:w-8 md:h-8 text-brand-purple group-hover:scale-125 transition delay-75"/><IconStar className="w-10 h-10 md:w-12 md:h-12 text-brand-pink group-hover:scale-125 transition"/><IconStar className="w-6 h-6 md:w-8 md:h-8 text-brand-purple group-hover:scale-125 transition delay-75"/></div>
                            <span className="font-bold tracking-widest text-brand-pink">{t.warp_10}</span>
                        </button>
                    </div>
                    <div className="mt-12 text-xs font-mono text-gray-500">{t.warp_pity} <span className="text-brand-gold">{Math.max(0, 50 - (user.gacha?.p5||0))}</span></div>
                </div>
            )}

            {step === 'reveal' && (
                <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-center z-30" onClick={handleCardClick}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-none"></div>
                    {drops.length > 1 && (<button onClick={(e) => { e.stopPropagation(); setStep('summary'); playSFX('select'); }} className="absolute top-4 right-4 md:top-8 md:right-8 cyber-btn bg-white/10 border border-white/20 text-white font-bold px-4 py-2 hover:bg-white/20 transition tracking-widest z-[60]">{t.warp_skip}</button>)}

                    <div className={`tarot-card ${flipped ? 'flipped' : ''} z-40`}>
                        <div className="tarot-inner">
                            <div className="tarot-back"><IconStar className="w-16 h-16 text-brand-cyan opacity-50" /></div>
                            <div className="tarot-front flex-col gap-6" style={{ borderColor: getRarityColor(drops[revealIdx].rarity), boxShadow: `0 0 30px ${getRarityColor(drops[revealIdx].rarity)}40, inset 0 0 20px ${getRarityColor(drops[revealIdx].rarity)}20` }}>
                                <div className="text-xs font-mono font-bold tracking-widest" style={{color: getRarityColor(drops[revealIdx].rarity)}}>{getRarityName(drops[revealIdx].rarity)}</div>
                                <div className="text-6xl">{drops[revealIdx].type==='title'?'🏷️':drops[revealIdx].type==='bg'?'🌌':drops[revealIdx].type==='frame'?'🖼️':drops[revealIdx].type==='ring'?'⭕':drops[revealIdx].type==='chip'?'💠':drops[revealIdx].val}</div>
                                <div className="font-bold tracking-widest text-center px-4" style={{color: drops[revealIdx].type==='title'?drops[revealIdx].c:'white', textShadow: drops[revealIdx].type==='title'?`0 0 10px ${drops[revealIdx].c}`:'none'}}>{drops[revealIdx].n}</div>
                                <div className="text-[10px] text-gray-400 mt-2 px-6 text-center leading-tight break-words" style={{whiteSpace: 'pre-wrap'}}>{drops[revealIdx].desc}</div>
                                {drops[revealIdx].isDup && <div className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-gray-300">DUPLICATE -&gt; REFUNDED</div>}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-10 font-mono text-gray-500 animate-pulse z-40">{t.warp_tap_reveal} ({revealIdx+1}/{drops.length})</div>
                </div>
            )}

            {step === 'summary' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-start md:justify-center p-4 md:p-8 animate-fade-in z-30 overflow-y-auto overflow-x-hidden">
                    <h2 className="text-2xl md:text-3xl font-black text-brand-cyan tracking-widest mb-6 md:mb-10 mt-10 md:mt-0">{t.warp_summary}</h2>
                    <div className={drops.length > 1 ? "grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto pb-20" : "flex justify-center pb-20"}>
                        {drops.map((item, i) => {
                            const c = getRarityColor(item.rarity);
                            return (
                                <div key={i} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center w-full md:w-36 h-40 md:h-48 relative overflow-hidden" style={{borderColor: c}}>
                                    <div className="absolute inset-0 opacity-10" style={{backgroundColor: c}}></div>
                                    <div className="text-3xl mb-2 relative z-10">{item.type==='title'?'🏷️':item.type==='bg'?'🌌':item.type==='frame'?'🖼️':item.type==='ring'?'⭕':item.type==='chip'?'💠':item.val}</div>
                                    <div className="text-xs font-bold text-center relative z-10" style={{color: item.type==='title'?item.c:'white'}}>{item.n}</div>
                                    {item.isDup && <div className="absolute bottom-2 text-[8px] font-mono text-brand-gold">REFUNDED</div>}
                                </div>
                            )
                        })}
                    </div>
                    <button onClick={() => setStep('menu')} className="fixed md:static bottom-6 cyber-btn bg-brand-cyan text-black font-black px-12 py-3 hover:bg-white transition tracking-widest z-50">OK</button>
                </div>
            )}
        </div>
    );
};

export default WarpScreen;
