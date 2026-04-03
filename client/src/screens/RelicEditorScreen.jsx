/**  
 * RelicEditorScreen.jsx — 圣遗物积木编辑器主页面  
 *  
 * 集成方式：  
 *   App.jsx:  
 *     import RelicEditorScreen from './screens/RelicEditorScreen';  
 *     {gameState === 'RELIC_EDITOR' && <RelicEditorScreen user={user} onBack={() => setGameState('LOBBY')} />}  
 *  
 * 依赖：npm install blockly --save  (在 client/ 目录下)  
 */  
  
import React, { useState, useEffect, useRef, useCallback } from 'react';  
import * as Blockly from 'blockly';
import 'blockly/blocks';  
import socket from '../socket';  
import { playSFX } from '../audio';  
  
import '../relic-editor/blocks';  
import { jsonGen } from '../relic-editor/generator';  
import toolbox from '../relic-editor/toolbox';  
  
// ==========================================  
// 常量  
// ==========================================  
  
const EMOJI_PALETTE = [  
    '⚔️','🛡️','🔥','❄️','⚡','💀','🩸','💉','🎯','💣',  
    '🌀','👁️','🐉','🦅','🌙','☀️','💎','🔮','🧪','🤖',  
    '👻','🌿','🪨','💫','🎭','🐺','🦇','🕷️','🔓','💻'  
];  
  
const BLOCKLY_THEME = Blockly.Theme.defineTheme('relicDark', {  
    base: Blockly.Themes.Classic,  
    componentStyles: {  
        workspaceBackgroundColour: '#0a0a12',  
        toolboxBackgroundColour: '#111118',  
        toolboxForegroundColour: '#e0e0e0',  
        flyoutBackgroundColour: '#15151f',  
        flyoutForegroundColour: '#ddd',  
        flyoutOpacity: 0.95,  
        scrollbarColour: '#1a1a2e',  
        insertionMarkerColour: '#00f0ff',  
        insertionMarkerOpacity: 0.4,  
        scrollbarOpacity: 0.5,  
    },  
    fontStyle: { family: 'monospace', size: 11 },  
});  
  
// ==========================================  
// 组件  
// ==========================================  
  
function RelicEditorScreen({ user, onBack }) {  
    // ---- 元数据 ----  
    const [relicName, setRelicName] = useState('我的圣遗物');  
    const [relicIcon, setRelicIcon] = useState('⚔️');  
    const [relicDesc, setRelicDesc] = useState('自定义圣遗物');  
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);  
  
    // ---- 标签页 ----  
    const [activeTab, setActiveTab] = useState('editor');  
  
    // ---- 保存/加载 ----  
    const [savedRelics, setSavedRelics] = useState([]);  
    const [saveMsg, setSaveMsg] = useState({ text: '', type: '' });  
  
    // ---- 模板 ----  
    const [showTemplates, setShowTemplates] = useState(false);  
  
    // ---- 积木计数 ----  
    const [blockCount, setBlockCount] = useState(0);  
  
    // ---- Refs ----  
    const editorDivRef = useRef(null);  
    const workspaceRef = useRef(null);  
  
    // ==========================================  
    // buildConfig — 从画布生成 JSON 配置  
    // ==========================================  
    const buildConfig = useCallback(() => {  
        const ws = workspaceRef.current;  
        if (!ws) return null;  
  
        const meta = { name: relicName, icon: relicIcon, desc: relicDesc };  
        const hooks = {};  
        const vfx = [];  
  
        const topBlocks = ws.getTopBlocks(true);  
  
        for (const block of topBlocks) {  
            const bType = block.type;  
  
            // 🔧 修复：VFX 预设块的链式解析崩溃
            if (bType.startsWith('vfx_')) {  
                const code = jsonGen.blockToCode(block);  
                if (code) {  
                    try {  
                        const cleaned = code.replace(/,\s*$/, '');  
                        // 手动包裹为数组形式以解析后续拼接的同类积木
                        const parsedArray = JSON.parse('[' + cleaned + ']');  
                        vfx.push(...parsedArray);  
                    } catch (e) { console.warn('[RelicEditor] VFX Parse Error:', e); }  
                }  
                continue;  
            }  
  
            // 事件块 → 钩子  
            if (!bType.startsWith('hook_')) continue;  
  
            const hookName = bType.replace('hook_', '');  
            const bodyBlock = block.getInputTargetBlock('BODY');  
            if (!bodyBlock) continue;  
  
            const rawCode = jsonGen.blockToCode(bodyBlock);  
            if (!rawCode) continue;  
  
            try {  
                const cleaned = '[' + rawCode.replace(/,\s*$/, '') + ']';  
                const nodes = JSON.parse(cleaned);  
  
                if (hookName === 'executeRelicAction') {  
                    const actionId = block.getFieldValue?.('ACTION_ID') || 'custom_skill';  
                    if (!hooks.executeRelicAction) hooks.executeRelicAction = [];  
                    hooks.executeRelicAction.push({ actionId, body: nodes });  
                } else {  
                    hooks[hookName] = nodes;  
                }  
            } catch (e) {  
                console.warn(`[RelicEditor] Failed to parse hook "${hookName}":`, e);  
            }  
        }  
  
        return { meta, hooks, vfx, version: 1 };  
    }, [relicName, relicIcon, relicDesc]);
  
    // ==========================================  
    // Blockly 初始化（只执行一次）  
    // ==========================================  
    useEffect(() => {  
        if (!editorDivRef.current || workspaceRef.current) return;  
  
        const ws = Blockly.inject(editorDivRef.current, {  
            toolbox,  
            theme: BLOCKLY_THEME,  
            renderer: 'zelos',  
            grid: { spacing: 25, length: 3, colour: '#1a1a2e', snap: true },  
            zoom: { controls: true, wheel: true, startScale: 0.85, maxScale: 2, minScale: 0.3 },  
            trashcan: true,  
            move: { scrollbars: true, drag: true, wheel: true },  
            sounds: false,  
        });  
  
        workspaceRef.current = ws;  
  
        // 监听积木数量变化  
        ws.addChangeListener(() => {  
            setBlockCount(ws.getAllBlocks(false).length);  
        });  
  
        return () => {  
            ws.dispose();  
            workspaceRef.current = null;  
        };  
    }, []);  
  
    // ==========================================  
    // Socket 监听  
    // ==========================================  
    useEffect(() => {  
        const handleList = (list) => setSavedRelics(list || []);  
        const handleSaved = (res) => {  
            if (res.ok) {  
                setSaveMsg({ text: '✅ 已保存', type: 'ok' });  
                playSFX?.('confirm');  
                socket.emit('relic:list', { userId: user?.id });  
            } else {  
                setSaveMsg({ text: `❌ ${res.error || '保存失败'}`, type: 'err' });  
            }  
            setTimeout(() => setSaveMsg({ text: '', type: '' }), 3000);  
        };  
        const handleDeleted = (res) => {  
            if (res.ok) socket.emit('relic:list', { userId: user?.id });  
        };  
  
        socket.on('relic:list', handleList);  
        socket.on('relic:saved', handleSaved);  
        socket.on('relic:deleted', handleDeleted);  
  
        socket.emit('relic:list', { userId: user?.id });  
  
        return () => {  
            socket.off('relic:list', handleList);  
            socket.off('relic:saved', handleSaved);  
            socket.off('relic:deleted', handleDeleted);  
        };  
    }, [user?.id]);  
  
    // ==========================================  
    // 保存  
    // ==========================================  
    const handleSave = useCallback(() => {  
        const config = buildConfig();  
        if (!config) {  
            setSaveMsg({ text: '❌ 画布为空', type: 'err' });  
            setTimeout(() => setSaveMsg({ text: '', type: '' }), 3000);  
            return;  
        }  
  
        const ws = workspaceRef.current;  
        const workspaceState = ws ? Blockly.serialization.workspaces.save(ws) : null;  
  
        socket.emit('relic:save', {  
            userId: user?.id,  
            relic: {  
                id: `custom_${user?.id}_${Date.now()}`,  
                config,  
                workspaceState,  
                updatedAt: new Date().toISOString(),  
            }  
        });  
    }, [buildConfig, user?.id]);  
  
    // ==========================================  
    // 加载  
    // ==========================================  
    const handleLoad = useCallback((relic) => {  
        const ws = workspaceRef.current;  
        if (!ws) return;  
  
        // 恢复元数据  
        const meta = relic.config?.meta;  
        if (meta) {  
            setRelicName(meta.name || '我的圣遗物');  
            setRelicIcon(meta.icon || '⚔️');  
            setRelicDesc(meta.desc || '');  
        }  
  
        // 恢复画布  
        if (relic.workspaceState) {  
            ws.clear();  
            Blockly.serialization.workspaces.load(relic.workspaceState, ws);  
        }  
  
        setActiveTab('editor');  
        playSFX?.('click');  
    }, []);  
  
    // ==========================================  
    // 删除  
    // ==========================================  
    const handleDelete = useCallback((relicId) => {  
        if (!window.confirm('确定删除这个圣遗物吗？')) return;  
        socket.emit('relic:delete', { userId: user?.id, relicId });  
    }, [user?.id]);  
  
    // ==========================================  
    // 加载模板  
    // ==========================================  
    const handleLoadTemplate = useCallback((tpl) => {  
        const ws = workspaceRef.current;  
        if (!ws) return;  
  
        setRelicName(tpl.name);  
        setRelicIcon(tpl.icon);  
        setRelicDesc(tpl.desc);  
  
        ws.clear();  
        if (tpl.workspace) {  
            Blockly.serialization.workspaces.load(tpl.workspace, ws);  
        }  
  
        setShowTemplates(false);  
        setActiveTab('editor');  
        playSFX?.('click');  
    }, []);  
  
    // ==========================================  
    // 渲染  
    // ==========================================  
    return (  
        <div className="h-screen w-full flex flex-col bg-[#030305] text-white overflow-hidden">  
  
            {/* ======== 顶栏 ======== */}  
            <header className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/10 shrink-0 z-20">  
                {/* 左侧：返回 + 元数据 */}  
                <div className="flex items-center gap-3">  
                    <button  
                        onClick={() => { playSFX?.('click'); onBack(); }}  
                        className="text-gray-400 hover:text-white transition text-sm font-mono"  
                    >  
                        ← 返回  
                    </button>  
  
                    <div className="w-px h-6 bg-white/10" />  
  
                    {/* 图标选择 */}  
                    <div className="relative">  
                        <button  
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}  
                            className="text-2xl hover:scale-110 transition-transform"  
                            title="选择图标"  
                        >  
                            {relicIcon}  
                        </button>  
                        {showEmojiPicker && (  
                            <div className="absolute top-full left-0 mt-1 bg-[#111118] border border-white/10 rounded-lg p-2 grid grid-cols-6 gap-1 z-50 shadow-xl">  
                                {EMOJI_PALETTE.map(e => (  
                                    <button  
                                        key={e}  
                                        onClick={() => { setRelicIcon(e); setShowEmojiPicker(false); }}  
                                        className="text-xl hover:bg-white/10 rounded p-1 transition"  
                                    >  
                                        {e}  
                                    </button>  
                                ))}  
                            </div>  
                        )}  
                    </div>  
  
                    {/* 名称 */}  
                    <input  
                        value={relicName}  
                        onChange={e => setRelicName(e.target.value)}  
                        maxLength={20}  
                        className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-brand-cyan outline-none font-mono text-sm w-40"  
                        placeholder="圣遗物名称"  
                    />  
  
                    {/* 描述 */}  
                    <input  
                        value={relicDesc}  
                        onChange={e => setRelicDesc(e.target.value)}  
                        maxLength={60}  
                        placeholder="描述..."  
                        className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-brand-cyan outline-none font-mono text-sm w-48 hidden md:block"  
                    />  
                </div>  
  
                {/* 右侧：操作按钮 */}  
                <div className="flex items-center gap-2">  
                    {saveMsg.text && (  
                        <span className={`text-xs font-mono px-2 py-1 rounded ${  
                            saveMsg.type === 'err'  
                                ? 'bg-red-500/20 text-red-400'  
                                : 'bg-green-500/20 text-green-400'  
                        }`}>  
                            {saveMsg.text}  
                        </span>  
                    )}  
                    <button  
                        onClick={() => setShowTemplates(true)}  
                        className="text-xs font-mono text-gray-400 hover:text-brand-purple bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10 transition"  
                    >  
                        📋 模板  
                    </button>  
                    <button  
                        onClick={handleSave}  
                        className="cyber-btn text-xs bg-brand-cyan text-black font-black px-4 py-2 hover:bg-white transition tracking-widest"  
                    >  
                        💾 保存  
                    </button>  
                </div>  
            </header>  
  
            {/* ======== 标签栏 ======== */}  
            <div className="flex gap-1 px-4 pt-2 shrink-0 z-10">  
                {[  
                    { id: 'editor', label: '🧩 逻辑编辑', color: 'brand-cyan' },  
                    { id: 'json',   label: '{ } JSON',    color: 'brand-purple' },  
                    { id: 'saves',  label: '📁 我的圣遗物', color: 'brand-pink' },  
                ].map(tab => (  
                    <button  
                        key={tab.id}  
                        onClick={() => setActiveTab(tab.id)}  
                        className={`text-xs font-mono px-4 py-1.5 rounded-t-lg transition ${  
                            activeTab === tab.id  
                                ? `bg-white/10 text-${tab.color} border-t border-x border-${tab.color}/30`  
                                : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'  
                        }`}  
                    >  
                        {tab.label}  
                    </button>  
                ))}  
            </div>  
  
            {/* ======== 主内容区 ======== */}  
            <div className="flex-1 relative overflow-hidden">  
  
                {/* ---- 编辑器标签页（Blockly 画布始终挂载，切标签时隐藏） ---- */}  
                <div  
                    className={`absolute inset-0 transition-opacity duration-200 ${  
                        activeTab === 'editor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'  
                    }`}  
                >  
                    <div ref={editorDivRef} className="w-full h-full" />  
                </div>  
  
                {/* ---- JSON 预览标签页 ---- */}  
                {activeTab === 'json' && (  
                    <div className="absolute inset-0 z-10 p-4 overflow-auto">  
                        <div className="max-w-4xl mx-auto">  
                            <div className="flex items-center justify-between mb-3">  
                                <h3 className="text-sm font-mono text-brand-purple">生成的 JSON 配置</h3>  
                                <button  
                                    onClick={() => {  
                                        const config = buildConfig();  
                                        if (config) {  
                                            navigator.clipboard?.writeText(JSON.stringify(config, null, 2));  
                                            setSaveMsg({ text: '📋 已复制', type: 'ok' });  
                                            setTimeout(() => setSaveMsg({ text: '', type: '' }), 2000);  
                                        }  
                                    }}  
                                    className="text-xs font-mono text-gray-400 hover:text-white bg-white/5 px-3 py-1 rounded hover:bg-white/10 transition"  
                                >  
                                    复制 JSON  
                                </button>  
                            </div>  
                            <pre className="bg-black/60 border border-white/10 rounded-lg p-4 text-xs font-mono text-green-400 overflow-auto max-h-[70vh] whitespace-pre-wrap">  
                                {JSON.stringify(buildConfig(), null, 2) || '// 画布为空'}  
                            </pre>  
                        </div>  
                    </div>  
                )}  
  
                {/* ---- 我的圣遗物标签页 ---- */}  
                {activeTab === 'saves' && (  
                    <div className="absolute inset-0 z-10 p-4 overflow-auto">  
                        <div className="max-w-4xl mx-auto">  
                            <h3 className="text-sm font-mono text-brand-pink mb-3">  
                                已保存的圣遗物 ({savedRelics.length})  
                            </h3>  
                            {savedRelics.length === 0 ? (  
                                <div className="text-center text-gray-500 font-mono text-sm py-20">  
                                    还没有保存任何圣遗物，去编辑器里创建一个吧！  
                                </div>  
                            ) : (  
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">  
                                    {savedRelics.map((relic, i) => (  
                                        <div  
                                            key={relic.id || i}  
                                            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-pink/30 transition"  
                                        >  
                                            <div className="flex items-center justify-between">  
                                                <div className="flex items-center gap-2">  
                                                    <span className="text-2xl">{relic.config?.meta?.icon || '❓'}</span>  
                                                    <div>  
                                                        <div className="font-mono text-sm text-white">  
                                                            {relic.config?.meta?.name || '未命名'}  
                                                        </div>  
                                                        <div className="font-mono text-xs text-gray-500">  
                                                            {relic.config?.meta?.desc || '无描述'}  
                                                        </div>  
                                                    </div>  
                                                </div>  
                                                <div className="flex gap-2">  
                                                    <button  
                                                        onClick={() => handleLoad(relic)}  
                                                        className="text-xs font-mono text-brand-cyan hover:text-white bg-brand-cyan/10 px-3 py-1 rounded hover:bg-brand-cyan/20 transition"  
                                                    >  
                                                        加载  
                                                    </button>  
                                                    <button  
                                                        onClick={() => handleDelete(relic.id)}  
                                                        className="text-xs font-mono text-red-400 hover:text-white bg-red-500/10 px-3 py-1 rounded hover:bg-red-500/20 transition"  
                                                    >  
                                                        删除  
                                                    </button>  
                                                </div>  
                                            </div>  
                                            {relic.updatedAt && (  
                                                <div className="text-[10px] font-mono text-gray-600 mt-2">  
                                                    更新于 {new Date(relic.updatedAt).toLocaleString()}  
                                                </div>  
                                            )}  
                                        </div>  
                                    ))}  
                                </div>  
                            )}  
                        </div>  
                    </div>  
                )}  
            </div>  
  
            {/* ======== 底部状态栏 ======== */}  
            <footer className="flex items-center justify-between px-4 py-1.5 bg-black/60 border-t border-white/10 shrink-0 z-20">  
                <span className="text-[10px] font-mono text-gray-600">  
                    积木: {blockCount} | ID: custom_{user?.id}  
                </span>  
                <span className="text-[10px] font-mono text-gray-600">  
                    圣遗物工坊 v1.0  
                </span>  
            </footer>  
  
            {/* ======== 模板选择弹窗 ======== */}  
            {showTemplates && (  
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">  
                    <div className="bg-[#111118] border border-white/10 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto shadow-2xl">  
                        <div className="flex items-center justify-between mb-4">  
                            <h3 className="font-mono text-sm text-brand-purple">📋 选择模板</h3>  
                            <button  
                                onClick={() => setShowTemplates(false)}  
                                className="text-gray-500 hover:text-white transition"  
                            >  
                                ✕  
                            </button>  
                        </div>  
                        <div className="space-y-2">  
                            {TEMPLATES.map((tpl, i) => (  
                                <button  
                                    key={i}  
                                    onClick={() => handleLoadTemplate(tpl)}  
                                    className="w-full text-left bg-white/5 border border-white/10 rounded-lg p-3 hover:border-brand-purple/30 hover:bg-white/10 transition"  
                                >  
                                    <div className="flex items-center gap-3">  
                                        <span className="text-2xl">{tpl.icon}</span>  
                                        <div>  
                                            <div className="font-mono text-sm text-white">{tpl.name}</div>  
                                            <div className="font-mono text-xs text-gray-500">{tpl.desc}</div>  
                                        </div>  
                                    </div>  
                                </button>  
                            ))}  
                        </div>  
                        <p className="text-[10px] font-mono text-gray-600 mt-4">  
                            选择模板会清空当前画布，请先保存当前工作。  
                        </p>  
                    </div>  
                </div>  
            )}  
        </div>  
    );  
}  
  
// ==========================================  
// 预置模板（组件外部，只声明一次）  
// ==========================================  
  
const TEMPLATES = [  
    {  
        name: '吸血效果',  
        icon: '🩸',  
        desc: '普通攻击造成伤害后恢复 0.5 HP',  
        workspace: {  
            blocks: { blocks: [{  
                type: 'hook_onDamageDealt',  
                x: 30, y: 30,  
                inputs: {  
                    BODY: {  
                        block: {  
                            type: 'control_if',  
                            inputs: {  
                                CONDITION: {  
                                    block: {  
                                        type: 'value_hook_param',  
                                        // 🔧 修复: PARAM -> NAME
                                        fields: { NAME: 'isNormal' }  
                                    }  
                                },  
                                THEN: {  
                                    block: {  
                                        type: 'action_heal',  
                                        inputs: {  
                                            WHO: { block: { type: 'player_self' } },  
                                            AMOUNT: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } }  
                                        }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                }  
            }]}  
        }  
    },  
    {  
        name: '充能大招',  
        icon: '⚡',  
        desc: '每回合充能 1 点，满 5 点释放 AOE 伤害',  
        workspace: {  
            blocks: { blocks: [  
                {  
                    type: 'hook_onGameStart',  
                    x: 30, y: 30,  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'state_set',  
                                fields: { KEY: 'energy' },  
                                inputs: {  
                                    VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } }  
                                }  
                            }  
                        }  
                    }  
                },  
                {  
                    type: 'hook_onTurnStart',  
                    x: 30, y: 150,  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'state_change',  
                                fields: { KEY: 'energy', OP: 'add' },  
                                inputs: {  
                                    DELTA: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
                                },  
                                next: {  
                                    block: {  
                                        type: 'action_log',  
                                        fields: { TYPE: 'info' },  
                                        inputs: {  
                                            TEXT: {  
                                                block: {  
                                                    type: 'value_text',  
                                                    fields: { TEXT: '⚡ 充能 +1' }  
                                                }  
                                            }  
                                        }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                },  
                {  
                    type: 'hook_modifyActions',  
                    x: 30, y: 320,  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'control_if',  
                                inputs: {  
                                    CONDITION: {  
                                        block: {  
                                            type: 'logic_compare',  
                                            fields: { OP: 'gte' },  
                                            inputs: {  
                                                A: { block: { type: 'state_get', fields: { KEY: 'energy' } } },  
                                                B: { shadow: { type: 'math_number', fields: { NUM: 5 } } }  
                                            }  
                                        }  
                                    },  
                                    THEN: {  
                                        block: {  
                                            type: 'action_add_skill',  
                                            fields: {  
                                                ACTION_ID: 'energy_blast',  
                                                ACTION_NAME: '⚡ 能量爆发',  
                                                ACTION_DESC: '消耗5能量，对所有敌人造成3伤害'  
                                            }  
                                        }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                },  
                {  
                    type: 'hook_executeRelicAction',  
                    x: 30, y: 500,  
                    fields: { ACTION_ID: 'energy_blast' },  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'state_set',  
                                fields: { KEY: 'energy' },  
                                inputs: {  
                                    VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } }  
                                },  
                                next: {  
                                    block: {  
                                        type: 'control_foreach_enemies',  
                                        inputs: {  
                                            BODY: {  
                                                block: {  
                                                    // 🔧 修复: action_damage -> action_apply_damage, IS_NORMAL 改为小写, AMOUNT -> DAMAGE
                                                    type: 'action_apply_damage',  
                                                    fields: { IS_NORMAL: 'false' },  
                                                    inputs: {  
                                                        TARGET: { block: { type: 'player_loop_target' } },  
                                                        DAMAGE: { shadow: { type: 'math_number', fields: { NUM: 3 } } }  
                                                    }  
                                                }  
                                            }  
                                        }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                }  
            ]  
        }  
    }
    },  
    // ---- 模板 3：AOE 伤害 ---- 
    { 
        name: 'AOE 伤害', 
        icon: '💥', 
        desc: '造成伤害后，对所有其他敌人造成 0.5 溅射伤害', 
        workspace: { 
            blocks: { blocks: [ 
                { 
                    type: 'hook_onDamageDealt',
                    x: 30, y: 30, 
                    inputs: { 
                        BODY: { 
                            block: { 
                                type: 'control_foreach_enemies', 
                                inputs: { 
                                    BODY: { 
                                        block: { 
                                            type: 'action_apply_damage', 
                                            fields: { IS_NORMAL: 'false' },
                                            inputs: { 
                                                TARGET: { block: { type: 'player_loop_target' } }, 
                                                DAMAGE: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } }
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            ]} 
        } 
    }, 
    // ---- 模板 4：近战加成 ---- 
    { 
        name: '近战加成', 
        icon: '⚔️', 
        desc: '近战（sword）伤害 +1', 
        workspace: { 
            blocks: { blocks: [
                { 
                    type: 'hook_modifyOutgoingDamage',
                    x: 30, y: 30, 
                    inputs: { 
                        BODY: { 
                            block: { 
                                type: 'control_if', 
                                inputs: { 
                                    CONDITION: { 
                                        block: { 
                                            type: 'logic_compare', 
                                            fields: { OP: 'eq' }, 
                                            inputs: { 
                                                A: { 
                                                    block: { 
                                                        type: 'value_hook_param', 
                                                        // 🔧 修复: PARAM -> NAME
                                                        fields: { NAME: 'actionId' } 
                                                    } 
                                                }, 
                                                B: { 
                                                    block: { 
                                                        type: 'value_text', 
                                                        fields: { TEXT: 'sword' } 
                                                    } 
                                                } 
                                            } 
                                        } 
                                    }, 
                                    THEN: { 
                                        block: { 
                                            type: 'action_set_result_damage', 
                                            inputs: { 
                                                VALUE: { 
                                                    block: { 
                                                        type: 'math_arithmetic', 
                                                        fields: { OP: 'add' }, 
                                                        inputs: { 
                                                            A: { 
                                                                block: { 
                                                                    type: 'value_hook_param', 
                                                                    // 🔧 修复: PARAM -> NAME
                                                                    fields: { NAME: 'baseDmg' } 
                                                                } 
                                                            }, 
                                                            B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } 
                                                        } 
                                                    } 
                                                } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            ]} 
        } 
    }, 
    // ---- 模板 5：重型装甲 ---- 
    { 
        name: '重型装甲', 
        icon: '🛡️', 
        desc: '游戏开始时 maxHp +2、HP +2', 
        workspace: { 
            blocks: { blocks: [ 
                { 
                    type: 'hook_onGameStart',
                    x: 30, y: 30, 
                    inputs: { 
                        BODY: { 
                            block: { 
                                type: 'set_prop_number',
                                fields: { PROP: 'maxHp' }, 
                                inputs: { 
                                    WHO: { shadow: { type: 'player_self' } }, 
                                    VALUE: { 
                                        block: { 
                                            type: 'math_arithmetic', 
                                            fields: { OP: 'add' }, 
                                            inputs: { 
                                                A: { 
                                                    block: { 
                                                        type: 'prop_number', 
                                                        inputs: { WHO: { shadow: { type: 'player_self' } } }, 
                                                        fields: { PROP: 'maxHp' } 
                                                    } 
                                                }, 
                                                B: { shadow: { type: 'math_number', fields: { NUM: 2 } } } 
                                            } 
                                        } 
                                    } 
                                }, 
                                next: { 
                                    block: { 
                                        type: 'action_heal', 
                                        inputs: { 
                                            WHO: { shadow: { type: 'player_self' } }, 
                                            AMOUNT: { shadow: { type: 'math_number', fields: { NUM: 2 } } } 
                                        } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            ]} 
        } 
    }
];  
  
export default RelicEditorScreen;