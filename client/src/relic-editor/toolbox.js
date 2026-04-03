/**  
 * Blockly Toolbox 配置  
 *  
 * 定义编辑器左侧工具箱的分类结构和预置积木。  
 * 使用 Blockly JSON toolbox 格式。  
 *  
 * 分类颜色与 blocks.js 中的 COLOR 常量保持一致：  
 *   事件 45 | 动作 160 | 日志 190 | 控制 120  
 *   属性 30 | 状态 330 | 数学 230 | 逻辑 210  
 *   特殊 280 | VFX 300  
 */  
  
const toolbox = {  
    kind: 'categoryToolbox',  
    contents: [  
  
        // ==========================================  
        // 一、事件（钩子入口）  
        // ==========================================  
        {  
            kind: 'category',  
            name: '🟡 事件（何时触发）',  
            colour: '45',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '── 游戏流程 ──'  
                },  
                { kind: 'block', type: 'hook_onGameStart' },  
                { kind: 'block', type: 'hook_onTurnStart' },  
                { kind: 'block', type: 'hook_onTurnEnd' },  
                {  
                    kind: 'label',  
                    text: '── 手牌与行动 ──'  
                },  
                { kind: 'block', type: 'hook_onHandChanged' },  
                { kind: 'block', type: 'hook_modifyActions' },  
                { kind: 'block', type: 'hook_executeRelicAction' },  
                {  
                    kind: 'label',  
                    text: '── 伤害与战斗 ──'  
                },  
                { kind: 'block', type: 'hook_modifyOutgoingDamage' },  
                { kind: 'block', type: 'hook_modifyIncomingDamage' },  
                { kind: 'block', type: 'hook_onDamageDealt' },  
                {  
                    kind: 'label',  
                    text: '── 其他 ──'  
                },  
                { kind: 'block', type: 'hook_onTntDetonated' },  
                { kind: 'block', type: 'hook_modifyShield' },  
                { kind: 'block', type: 'hook_modifyCrReward' },  
            ]  
        },  
  
        { kind: 'sep' },  // 分隔线  
  
        // ==========================================  
        // 二、动作（做什么）  
        // ==========================================  
        {  
            kind: 'category',  
            name: '🟢 动作（做什么）',  
            colour: '160',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '── 治疗与伤害 ──'  
                },  
                {  
                    kind: 'block',  
                    type: 'action_heal',  
                    inputs: {  
                        AMOUNT: {  
                            shadow: { type: 'math_number', fields: { NUM: 1 } }  
                        }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'action_self_damage',  
                    inputs: {  
                        AMOUNT: {  
                            shadow: { type: 'math_number', fields: { NUM: 1 } }  
                        }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'action_apply_damage',  
                    inputs: {  
                        TARGET: {  
                            shadow: { type: 'player_target' }  
                        },  
                        DAMAGE: {  
                            shadow: { type: 'math_number', fields: { NUM: 1 } }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── 属性修改 ──'  
                },  
                {  
                    kind: 'block',  
                    type: 'set_prop_number',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        },  
                        VALUE: {  
                            shadow: { type: 'math_number', fields: { NUM: 10 } }  
                        }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'set_prop_boolean',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── Power 控制 ──'  
                },  
                { kind: 'block', type: 'action_temp_remove_power' },  
                { kind: 'block', type: 'action_restore_power' },  
                {  
                    kind: 'label',  
                    text: '── 状态同步 ──'  
                },  
                { kind: 'block', type: 'action_sync_states' },  
                { kind: 'block', type: 'action_update_shield' },  
            ]  
        },  
  
        // ==========================================  
        // 三、技能按钮  
        // ==========================================  
        {  
            kind: 'category',  
            name: '⚡ 技能按钮',  
            colour: '160',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '在 [修改行动列表] 钩子中使用'  
                },  
                {  
                    kind: 'block',  
                    type: 'action_add_skill',  
                },  
                {  
                    kind: 'label',  
                    text: '── 结果设置 ──'  
                },  
                {  
                    kind: 'label',  
                    text: '在伤害/护盾/CR钩子中使用'  
                },  
                {  
                    kind: 'block',  
                    type: 'action_set_result_damage',  
                    inputs: {  
                        VALUE: {  
                            shadow: { type: 'math_number', fields: { NUM: 2 } }  
                        }  
                    }  
                },  
                { kind: 'block', type: 'action_set_shield' },  
                {  
                    kind: 'block',  
                    type: 'action_set_result_cr',  
                    inputs: {  
                        VALUE: {  
                            shadow: { type: 'math_number', fields: { NUM: 100 } }  
                        }  
                    }  
                },  
            ]  
        },  
  
        // ==========================================  
        // 四、日志与特效  
        // ==========================================  
        {  
            kind: 'category',  
            name: '💬 日志与特效',  
            colour: '190',  
            contents: [  
                {  
                    kind: 'block',  
                    type: 'action_log',  
                },  
                {  
                    kind: 'block',  
                    type: 'action_emit_vfx',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        }  
                    }  
                },  
            ]  
        },  
  
        { kind: 'sep' },  
  
        // ==========================================  
        // 五、控制流  
        // ==========================================  
        {  
            kind: 'category',  
            name: '🔁 控制',  
            colour: '120',  
            contents: [  
                { kind: 'block', type: 'control_if' },  
                { kind: 'block', type: 'control_if_else' },  
                { kind: 'block', type: 'control_foreach_enemies' },  
                { kind: 'block', type: 'control_foreach_alive' },  
            ]  
        },  
  
        // ==========================================  
        // 六、玩家引用  
        // ==========================================  
        {  
            kind: 'category',  
            name: '👤 玩家',  
            colour: '30',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '── 引用谁 ──'  
                },  
                { kind: 'block', type: 'player_self' },  
                { kind: 'block', type: 'player_target' },  
                { kind: 'block', type: 'player_loop_target' },  
                {  
                    kind: 'label',  
                    text: '── 读取数值属性 ──'  
                },  
                {  
                    kind: 'block',  
                    type: 'prop_number',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── 读取布尔属性 ──'  
                },  
                {  
                    kind: 'block',  
                    type: 'prop_boolean',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── 手牌检查 ──'  
                },  
                {  
                    kind: 'block',  
                    type: 'prop_hand_includes',  
                    inputs: {  
                        WHO: {  
                            shadow: { type: 'player_self' }  
                        },  
                        VALUE: {  
                            shadow: { type: 'math_number', fields: { NUM: 5 } }  
                        }  
                    }  
                },  
            ]  
        },  
  
        // ==========================================  
        // 七、状态变量  
        // ==========================================  
        {  
            kind: 'category',  
            name: '📦 状态变量',  
            colour: '330',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '自定义变量（存在 relicState 中）'  
                },  
                { kind: 'block', type: 'state_get' },  
                {  
                    kind: 'block',  
                    type: 'state_set',  
                    inputs: {  
                        VALUE: {  
                            shadow: { type: 'math_number', fields: { NUM: 0 } }  
                        }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'state_change',  
                    inputs: {  
                        DELTA: {  
                            shadow: { type: 'math_number', fields: { NUM: 1 } }  
                        }  
                    }  
                },  
            ]  
        },  
  
        { kind: 'sep' },  
  
        // ==========================================  
        // 八、数学运算  
        // ==========================================  
        {  
            kind: 'category',  
            name: '🔢 数学',  
            colour: '230',  
            contents: [  
                {  
                    kind: 'block',  
                    type: 'math_number',  
                },  
                {  
                    kind: 'block',  
                    type: 'math_arithmetic',  
                    inputs: {  
                        A: { shadow: { type: 'math_number', fields: { NUM: 1 } } },  
                        B: { shadow: { type: 'math_number', fields: { NUM: 1 } } }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'math_minmax',  
                    inputs: {  
                        A: { shadow: { type: 'math_number', fields: { NUM: 0 } } },  
                        B: { shadow: { type: 'math_number', fields: { NUM: 10 } } }  
                    }  
                },  
                {  
                    kind: 'block',  
                    type: 'math_round',  
                    inputs: {  
                        VALUE: { shadow: { type: 'math_number', fields: { NUM: 3.5 } } }  
                    }  
                },  
            ]  
        },  
  
        // ==========================================  
        // 九、比较与逻辑  
        // ==========================================  
        {  
            kind: 'category',  
            name: '⚖️ 逻辑',  
            colour: '210',  
            contents: [  
                {  
                    kind: 'block',  
                    type: 'logic_compare',  
                    inputs: {  
                        A: { shadow: { type: 'math_number', fields: { NUM: 0 } } },  
                        B: { shadow: { type: 'math_number', fields: { NUM: 0 } } }  
                    }  
                },  
                { kind: 'block', type: 'logic_operation' },  
                { kind: 'block', type: 'logic_not' },  
                { kind: 'block', type: 'logic_boolean' },  
            ]  
        },  
  
        // ==========================================  
        // 十、特殊值  
        // ==========================================  
        {  
            kind: 'category',  
            name: '🎲 特殊值',  
            colour: '280',  
            contents: [  
                { kind: 'block', type: 'value_count_enemies' },  
                { kind: 'block', type: 'value_count_alive' },  
                {  
                    kind: 'block',  
                    type: 'value_random',  
                    inputs: {  
                        MIN: { shadow: { type: 'math_number', fields: { NUM: 1 } } },  
                        MAX: { shadow: { type: 'math_number', fields: { NUM: 6 } } }  
                    }  
                },  
                { kind: 'block', type: 'value_hook_param' },  
                { kind: 'block', type: 'value_text' },  
                {  
                    kind: 'block',  
                    type: 'value_concat',  
                    inputs: {  
                        A: { shadow: { type: 'value_text', fields: { TEXT: '[圣遗物] ' } } },  
                        B: { shadow: { type: 'value_text', fields: { TEXT: '效果触发！' } } }  
                    }  
                },  
            ]  
        },  
  
        { kind: 'sep' },  
  
        // ==========================================  
        // 十一、视觉效果（VFX 预设）  
        // ==========================================  
        {  
            kind: 'category',  
            name: '✨ 视觉效果',  
            colour: '300',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '拖入 VFX 配置区域使用'  
                },  
                { kind: 'block', type: 'vfx_glow' },  
                { kind: 'block', type: 'vfx_particles' },  
                { kind: 'block', type: 'vfx_status_bar' },  
                { kind: 'block', type: 'vfx_card_override' },  
            ]  
        },  
  
        { kind: 'sep' },  
  
        // ==========================================  
        // 十二、常用模板（预组装积木组合）  
        // ==========================================  
        {  
            kind: 'category',  
            name: '📋 常用模板',  
            colour: '45',  
            contents: [  
                {  
                    kind: 'label',  
                    text: '── 吸血效果 ──'  
                },  
                {  
                    // 预组装：造成伤害后治疗自己  
                    kind: 'block',  
                    type: 'hook_onDamageDealt',  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'control_if',  
                                inputs: {  
                                    CONDITION: {  
                                        block: {  
                                            type: 'value_hook_param',  
                                            fields: { PARAM: 'isNormal' }  
                                        }  
                                    },  
                                    THEN: {  
                                        block: {  
                                            type: 'action_heal',  
                                            inputs: {  
                                                AMOUNT: {  
                                                    shadow: { type: 'math_number', fields: { NUM: 0.5 } }  
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
                    kind: 'label',  
                    text: '── 初始化状态变量 ──'  
                },  
                {  
                    // 预组装：游戏开始时初始化变量  
                    kind: 'block',  
                    type: 'hook_onGameStart',  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'state_set',  
                                fields: { KEY: 'energy' },  
                                inputs: {  
                                    VALUE: {  
                                        shadow: { type: 'math_number', fields: { NUM: 0 } }  
                                    }  
                                },  
                                next: {  
                                    block: {  
                                        type: 'action_log',  
                                        fields: { TYPE: 'info' },  
                                        inputs: {  
                                            TEXT: {  
                                                shadow: {   
                                                    type: 'value_text',   
                                                    fields: { TEXT: '[圣遗物] 初始化完成！' }   
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
                    kind: 'label',  
                    text: '── 每回合充能 ──'  
                },  
                {  
                    // 预组装：每回合增加能量  
                    kind: 'block',  
                    type: 'hook_onTurnStart',  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'state_change',  
                                fields: { KEY: 'energy', OP: 'add' },  
                                inputs: {  
                                    DELTA: {  
                                        shadow: { type: 'math_number', fields: { NUM: 1 } }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── 对所有敌人造成伤害 ──'  
                },  
                {  
                    // 预组装：遍历敌人造成伤害  
                    kind: 'block',  
                    type: 'control_foreach_enemies',  
                    inputs: {  
                        BODY: {  
                            block: {  
                                type: 'action_apply_damage',  
                                inputs: {  
                                    TARGET: {  
                                        block: { type: 'player_loop_target' }  
                                    },  
                                    DAMAGE: {  
                                        shadow: { type: 'math_number', fields: { NUM: 2 } }  
                                    }  
                                }  
                            }  
                        }  
                    }  
                },  
                {  
                    kind: 'label',  
                    text: '── 近战伤害加成 ──'  
                },  
                {  
                    // 预组装：近战攻击 +1 伤害  
                    kind: 'block',  
                    type: 'hook_modifyOutgoingDamage',  
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
                                                        fields: { PARAM: 'actionId' }  
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
                                                                    fields: { PARAM: 'baseDmg' }  
                                                                }  
                                                            },  
                                                            B: {  
                                                                shadow: { type: 'math_number', fields: { NUM: 1 } }  
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
                },  
            ]  
        },  
    ]  
};  
  
export default toolbox;