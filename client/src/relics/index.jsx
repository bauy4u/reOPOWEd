import React from 'react';

/**
 * Relic VFX Registry — 前端视觉效果注册表
 *
 * 每个圣遗物可以在此注册表中添加一个条目，键名为圣遗物的 chipId（如 'chip_hacker'）。
 * 条目对象支持以下四个可选方法：
 *
 * @method getPlayerClasses(player, relicState) → string
 *   返回附加到玩家容器的 CSS 类名，用于持续性视觉状态。
 *   示例: return relicState?.active ? 'relic-glow' : '';
 *
 * @method renderOverlay(player, relicState) → React.ReactNode | null
 *   返回覆盖在玩家头像上的 React 元素，用于粒子/动画等效果。
 *   示例: return relicState?.active ? <div className="overlay-fx" /> : null;
 *
 * @method getHandOverride(handValue, relicState) → { icon, name, className } | null
 *   当特定手牌值需要显示为特殊卡牌时，返回覆盖对象。
 *   示例: return handValue === 2 ? { icon: '🔓', name: '门户', className: 'card-portal' } : null;
 *
 * @method renderStatusBar(player, relicState) → React.ReactNode | null
 *   返回显示在玩家下方的状态栏 React 元素，用于展示圣遗物数值。
 *   示例: return <div className="status-bar">能量: {relicState?.energy}</div>;
 *
 * 模板:
 *   chip_example: {
 *       getPlayerClasses(player, relicState) { return ''; },
 *       renderOverlay(player, relicState) { return null; },
 *       getHandOverride(handValue, relicState) { return null; },
 *       renderStatusBar(player, relicState) { return null; }
 *   }
 */
const relicVFXRegistry = {
    chip_athlete: {
        getPlayerClasses(player, relicState) {
            return 'relic-athlete-glow';
        },
        renderStatusBar(player, relicState) {
            return (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 border border-blue-400/50 px-2 py-0.5 rounded text-[8px] md:text-[10px] font-mono text-blue-400 whitespace-nowrap z-30 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                    💪 健儿 | 伤害x2 CR x2
                </div>
            );
        }
    },
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

const defaultVFX = {
    getPlayerClasses() { return ''; },
    renderOverlay() { return null; },
    getHandOverride() { return null; },
    renderStatusBar() { return null; }
};

export function getRelicVFX(chipId) {
    const entry = relicVFXRegistry[chipId];
    if (!entry) return null;
    return { ...defaultVFX, ...entry };
}

export default relicVFXRegistry;
