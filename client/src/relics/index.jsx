import React from 'react';

// Relic VFX registry - register frontend visual effects for relics here
const relicVFXRegistry = {
    chip_hacker: {
        getPlayerClasses(player, relicState) {
            return relicState?.isInPenetration ? 'relic-hacker-penetration' : '';
        },
        renderOverlay(player, relicState) {
            if (!relicState?.isInPenetration) return null;
            return (
                <div className="hacker-digits-overlay">
                    {[...Array(8)].map((_, i) => (
                        <span key={i} className="hacker-digit" style={{ animationDelay: `${i * 0.15}s` }}>
                            {Math.floor(Math.random() * 2)}
                        </span>
                    ))}
                </div>
            );
        },
        getHandOverride(handValue, relicState) {
            if (handValue === 2 && relicState?.portalActive) {
                return { icon: '🔓', name: '渗透门户', className: 'card-hacker-portal' };
            }
            return null;
        },
        renderStatusBar(player, relicState) {
            if (!relicState) return null;
            return (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 border border-green-500/50 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-mono text-green-400 whitespace-nowrap z-30 shadow-[0_0_10px_rgba(0,255,0,0.3)]">
                    渗透: {relicState.penetrationValue} {relicState.skillFired ? '(已释放)' : relicState.portalActive ? '' : '(失效)'}
                </div>
            );
        }
    }
};

export function getRelicVFX(chipId) {
    return relicVFXRegistry[chipId] || null;
}

export default relicVFXRegistry;
