// ============================================================
// config.js - Global config, UI schema, life events, insurance
// ============================================================

// ============================================================
// 模块1: 默认配置 (defaultConfig)
// ============================================================
const defaultConfig = {
    meta: {
        version: "v2.0",
        model_complexity_mode: "simple",
        household_mode: "dual_income",
        years: 30,
        n_sims: 500,
        currency: "CNY"
    },
    base: {
        enabled: true,
        start_cash: 550000,
        inflation: 0.025,
        annual_living_cost: 120000,
        living_cost_growth: 0.025,
        min_cash_buffer: 0
    },
    income_tax_module: {
        enabled: true,
        mode: "simple",
        params: {
            income_input_mode: "pretax",
            main_monthly_salary: 18000,
            main_salary_type: "aftertax",
            main_annual_bonus: 125000,
            main_bonus_type: "aftertax",
            main_salary_growth: 0.03,
            spouse_monthly_salary: 12000,
            spouse_salary_type: "aftertax",
            spouse_annual_bonus: 30000,
            spouse_bonus_type: "aftertax",
            spouse_salary_growth: 0.02,
            personal_standard_deduction_annual: 60000,
            main_tax_credit_annual: 12000,
            spouse_tax_credit_annual: 0,
            social_insurance_enabled: false,
            social_insurance_mode: "simple",
            main_social_insurance_base: 0,
            spouse_social_insurance_base: 0,
            bonus_tax_mode: "merged"
        }
    },
    pf_module: {
        enabled: true,
        mode: "simple",
        params: {
            main_monthly_pf: 3145,
            spouse_monthly_pf: 0,
            pf_withdraw_mode: "mortgage",
            pf_available_ratio: 1.0,
            pf_withdraw_cap_annual: 36000,
            pf_policy_city: "default"
        }
    },
    housing_module: {
        enabled: true,
        mode: "simple",
        params: {
            decision_mode: "compare",
            house_price: 2500000,
            loan_balance: 2000000,
            purchase_tax_and_fees: 30000,
            annual_house_maintenance_ratio: 0.002,
            monthly_rent: 2600,
            rent_growth_anchor: 0.02,
            city_tier: "tier2_strong",
            rent_sale_ratio_anchor: 0.02,
            policy_risk_factor: 0.0,
            vacancy_risk_factor: 0.0,
            early_house_trend: -0.01,
            recovery_house_trend: 0.01,
            mature_house_trend_low: 0.015,
            mature_house_trend_high: 0.02,
            house_sigma: 0.085,
            house_mean_reversion: 0.35
        }
    },
    mortgage_module: {
        enabled: true,
        mode: "simple",
        params: {
            monthly_emi: 8220,
            mortgage_annual_rate: 0.027,
            repayment_type: "equal_payment",
            rate_type: "fixed",
            repricing_cycle_years: 1,
            extra_repay_bonus_ratio: 0.5,
            prepay_strategy: "reduce_term",
            prepay_penalty_rate: 0.0,
            post_mortgage_invest_ratio: 0.9
        }
    },
    portfolio_module: {
        enabled: true,
        mode: "simple",
        params: {
            invest_mu: 0.055,
            invest_sigma: 0.15,
            cash_alloc: 0.2,
            bond_alloc: 0.2,
            equity_alloc: 0.5,
            gold_alloc: 0.05,
            overseas_alloc: 0.05,
            cash_mu: 0.02,
            cash_sigma: 0.01,
            bond_mu: 0.035,
            bond_sigma: 0.04,
            equity_mu: 0.08,
            equity_sigma: 0.18,
            gold_mu: 0.04,
            gold_sigma: 0.16,
            overseas_mu: 0.07,
            overseas_sigma: 0.2,
            rebalance_mode: "annual",
            rebalance_threshold: 0.05,
            correlation: 0.55
        }
    },
    crisis_module: {
        enabled: true,
        mode: "simple",
        params: {
            crisis_prob: 0.06,
            crisis_cash_drawdown: -0.25,
            crisis_house_drawdown: -0.12,
            unemployment_months: 6,
            bonus_cut_ratio_in_crisis: 0.5,
            annual_bonus_volatility: 0.05,
            macro_state_mode: "independent",
            income_recovery_lag: 2,
            state_transition_matrix: {
                normal:    { normal: 0.82, slowdown: 0.12, recession: 0.03, recovery: 0.03 },
                slowdown:  { normal: 0.30, slowdown: 0.40, recession: 0.20, recovery: 0.10 },
                recession: { normal: 0.05, slowdown: 0.20, recession: 0.45, recovery: 0.30 },
                recovery:  { normal: 0.50, slowdown: 0.10, recession: 0.05, recovery: 0.35 }
            }
        }
    },
    life_events_module: {
        enabled: false,
        mode: "simple",
        params: {
            events: []
        }
    },
    insurance_module: {
        enabled: false,
        mode: "simple",
        params: {
            annual_premium_total: 0,
            critical_illness_cover: 0,
            medical_cover_ratio: 0,
            term_life_cover: 0,
            accident_cover: 0,
            crisis_loss_offset_ratio: 0.0
        }
    },
    analysis_module: {
        enabled: true,
        mode: "simple",
        params: {
            ruin_definition_mode: "simple",
            emergency_fund_months_threshold: 6,
            dscr_threshold: 1.0,
            scenario_presets_enabled: true,
            selected_scenarios: ["base", "high_inflation", "housing_downturn", "low_growth", "job_loss", "bull_market", "double_shock"],
            sensitivity_enabled: false,
            sensitivity_vars: ["inflation", "main_salary_growth", "invest_mu", "house_price", "rent_growth_anchor", "crisis_prob"],
            sensitivity_step: 0.01,
            goal_seek_enabled: false,
            target_metric: "median_real_wealth",
            target_value: 10000000,
            decision_vars: ["start_cash", "main_salary_growth", "equity_alloc"]
        }
    }
};

// ============================================================
// 模块2: UI Schema (uiSchema)
// ============================================================
const uiSchema = {
    moduleTabs: [
        { id: 'base', icon: '⚙️', label: '基础设定 / Base' },
        { id: 'income_tax', icon: '💰', label: '收入税务 / Income' },
        { id: 'pf', icon: '🏦', label: '公积金 / PF' },
        { id: 'housing', icon: '🏠', label: '房产住房 / Housing' },
        { id: 'mortgage', icon: '📋', label: '房贷 / Mortgage' },
        { id: 'portfolio', icon: '📈', label: '投资 / Portfolio' },
        { id: 'crisis', icon: '⚠️', label: '危机宏观 / Crisis' },
        { id: 'life_events', icon: '📅', label: '生命周期 / Life Events' },
        { id: 'insurance', icon: '🛡️', label: '保险 / Insurance' },
        { id: 'analysis', icon: '📊', label: '分析 / Analysis' }
    ],
    scenarioLabels: {
        base: "基准 / Base",
        high_inflation: "高通胀 / High Inflation",
        housing_downturn: "房产下行 / Housing Down",
        low_growth: "低增长 / Low Growth",
        job_loss: "失业冲击 / Job Loss",
        bull_market: "牛市 / Bull Market",
        double_shock: "双重冲击 / Double Shock"
    },
    tableRows: [
        { key: "median_real_wan", label: "中位数真实购买力 / Median Real Wealth", type: "wan", tip: "已扣除通胀的真实购买力 / Inflation-adjusted real purchasing power" },
        { key: "mean_real_wan", label: "平均真实购买力 / Mean Real Wealth", type: "wan", tip: "算术平均 / Arithmetic mean" },
        { key: "p10_real_wan", label: "悲观预期 P10 / P10 (Bearish)", type: "wan", tip: "运气极差情况 / Worst 10% scenario" },
        { key: "p90_real_wan", label: "乐观预期 P90 / P90 (Bullish)", type: "wan", tip: "运气极佳情况 / Best 10% scenario" },
        { key: "ruin_probability", label: "破产概率 / Ruin Probability", type: "pct", reverseColor: true, tip: "现金流断裂概率 / Cash flow collapse probability" },
        { key: "avg_loan_free_year", label: "平均还清房贷年份 / Avg Loan-Free Year", type: "year", tip: "购房方案 / Buy scenario" },
        { key: "avg_crisis_count", label: "平均危机命中次数 / Avg Crisis Hits", type: "count", reverseColor: true, tip: "生命周期内经历 / Lifetime crisis count" }
    ],
    // UI 控件提示
    uiFieldTips: {
        "sims": "每次仿真的路径数量。数量越大越稳定，但耗时也越长；通常 500-2000 适合日常试算 / Number of simulation paths. Higher is steadier but slower; 500-2000 is practical for routine runs.",
        "household_mode": "切换单收入或双收入家庭结构 / Switch between single-income and dual-income households.",
        "complexity_mode": "切换简化版与复杂版模型 / Switch between simple and advanced model detail.",
        "base_tab": "基础现金、通胀、生活成本等全局底层参数 / Global base settings for cash, inflation, and living costs.",
        "income_tax_tab": "工资、奖金、个税与专项扣除设置 / Income, bonus, tax, and deduction settings.",
        "pf_tab": "公积金缴存与提取设置 / Provident fund contribution and withdrawal settings.",
        "housing_tab": "房价、租金与住房决策设置 / Housing price, rent, and decision settings.",
        "mortgage_tab": "房贷参数与自动联动设置 / Mortgage settings with auto-linkage.",
        "portfolio_tab": "流动资产收益、波动与配置比例设置 / Portfolio return, risk, and allocation settings.",
        "crisis_tab": "危机概率、冲击幅度与宏观状态设置 / Crisis probability, shock size, and macro regime settings.",
        "life_events_tab": "教育、育儿、养老等生命周期现金流事件 / Lifecycle cash flow events such as education or childcare.",
        "insurance_tab": "保费与风险对冲设置 / Premium and risk-hedging settings.",
        "analysis_tab": "情景分析、敏感性与目标求解设置 / Scenario, sensitivity, and goal-seek settings.",
        "bonus_tax_mode": "选择奖金并入综合所得，或单独计税 / Choose merged bonus tax or separate bonus tax.",
        "pf_withdraw_mode": "决定公积金用于抵房贷、抵房租或不提取 / Decide whether provident fund offsets mortgage, rent, or is not withdrawn.",
        "decision_mode": "比较买房与租房，或仅模拟其中一种方案 / Compare buy vs rent, or simulate only one path.",
        "city_tier": "用于调整房价与租金的长期特征参数 / Used to anchor long-run housing and rent dynamics.",
        "repayment_type": "等额本息为固定月供，等额本金为首月较高、之后递减 / Equal payment keeps payments steadier; equal principal starts higher and declines.",
        "rate_type": "固定利率保持不变，浮动利率按重定价周期更新 / Fixed rate stays unchanged; floating reprices by cycle.",
        "prepay_strategy": "提前还款后可选择缩短期限或降低月供 / Choose to shorten term or reduce monthly payment after prepayment.",
        "rebalance_mode": "资产配置是否自动再平衡 / Whether the portfolio auto-rebalances.",
        "macro_state_mode": "独立危机为简单抽样，状态机为宏观周期切换 / Independent crisis is simple random shock; state machine follows macro regimes.",
        "ruin_definition_mode": "定义何时视为财务断裂 / Defines when the simulation counts as ruin.",
        "sensitivity_enabled": "开启后会围绕关键参数做敏感性测试 / Enables sensitivity testing on key inputs.",
        "goal_seek_enabled": "开启后可反推达到目标净资产所需条件 / Enables reverse target seeking.",
        "mortgage_linkage": "房贷总额、利率、月供、年限与还款方式会自动联动 / Loan amount, rate, monthly payment, term, and repayment type are linked automatically.",
        "allocation_linkage": "大类资产比例会自动校准，总和保持为100% / Allocation weights are auto-normalized to 100%.",
        "cash_alloc": "建议值：10%–30%。原因：承担应急与低波动缓冲，比例过低会削弱抗风险能力，过高会拖累长期回报。",
        "bond_alloc": "建议值：10%–30%。原因：用于降低组合波动、平滑回撤，适合作为股票资产的稳定器。",
        "equity_alloc": "建议值：40%–70%。原因：承担长期增长的核心收益来源，但波动最高，应结合风险承受能力控制比例。",
        "gold_alloc": "建议值：0%–15%。原因：主要对冲通胀、地缘与极端波动，不宜过高，否则会压低长期复合收益。",
        "overseas_alloc": "建议值：0%–20%。原因：用于分散单一市场风险，剩余比例自动分配到该项。"
    },
    // 基础设定字段提示
    baseFieldTips: {
        "初始流动资金 (元)": "说明：当前可立即动用的现金、活期、货基等高流动性资产。\n建议值：至少覆盖 6–12 个月总支出。\n原因：这是抵御失业、医疗、房屋维修等突发事件的第一道缓冲。",
        "仿真年限": "说明：模型向未来滚动测算的总年数。\n建议值：10 年看中期，20–30 年看买房/投资长期效果。\n原因：房产、房贷和复利效应通常在 10 年后才逐步拉开。",
        "长期年化通胀率": "说明：用于把未来资产折算成今天购买力的长期通胀假设。\n建议值：中国长期可先用 2%–3%，默认 2.5%。\n原因：通胀过低会高估未来资产，过高会低估长期购买力。",
        "基础年生活费 (元)": "说明：不含房租、房贷的全年基础支出，如吃穿行、教育、社交等。\n建议值：按最近 12 个月实际支出取均值后上浮 5%–10%。\n原因：多数人会低估零散支出，适度上浮更稳健。",
        "生活费年化涨幅": "说明：生活费每年的自然增长速度。\n建议值：可先填 2%–5%。\n原因：收入上涨、家庭阶段变化和服务类价格上涨，都会推高生活成本。",
        "家庭流动性枯竭线": "说明：当可动用现金跌破该值时，模型视为流动性危机或破产阈值。\n建议值：至少保留 3–6 个月必要支出；偏稳健可填 6–12 个月。\n原因：现金不一定为零才算危险，低于安全垫时家庭韧性已明显下降。"
    },
    // 收入税务字段提示
    incomeFieldTips: {
        "本人月薪 (税后元)": "说明：本人每月稳定到手收入。\n建议值：用过去 6–12 个月平均到手薪资。\n原因：只填最高月份会高估家庭现金流稳定性。",
        "本人年终奖 (税后元)": "说明：本人年度一次性奖金或相对确定的绩效部分。\n建议值：用近 2–3 年平均值；不确定就打 7–8 折。\n原因：奖金波动通常比工资更大，宜保守。",
        "本人薪资年增长": "说明：本人薪资的长期年化增长假设。\n建议值：成熟岗位 2%–5%，高成长岗位 5%–8%。\n原因：长期增速不宜直接套用短期跳槽涨薪。",
        "配偶月薪 (税前约)": "说明：配偶月度工资，当前界面按近似输入处理。\n建议值：使用近 6–12 个月平均值。\n原因：双收入家庭对破产概率影响很大，需尽量接近真实中枢。",
        "配偶年终奖 (税后)": "说明：配偶年度奖金。\n建议值：按近 2–3 年平均值或保守折减值。\n原因：奖金不稳定时，家庭抗压能力容易被高估。",
        "配偶薪资年增长 / Spouse Growth": "说明：配偶工资长期年化增长率。\n建议值：可先用 2%–5%。\n原因：双收入中的第二收入常影响家庭波动性和下行保护。",
        "个税年度免征额": "说明：年度个税基本减除费用。\n建议值：默认 60000；仅在政策口径变化时调整。\n原因：这是税后现金流计算的底层参数。",
        "本人专项附加扣除": "说明：子女教育、住房贷款利息、赡养老人等专项附加扣除合计。\n建议值：按真实年度合计填入。\n原因：该项会直接影响税负与到手收入。",
        "配偶专项附加扣除": "说明：配偶可享受的年度专项附加扣除合计。\n建议值：按真实年度合计填入。\n原因：双收入家庭的税后测算需要分别处理。",
        "奖金计税方式": "说明：决定年终奖按合并计税还是单独计税。\n建议值：以实际税务口径为准；不确定可两种都试。\n原因：不同方式会影响税后现金流和提前还贷能力。"
    },
    // 公积金字段提示
    pfFieldTips: {
        "本人月度公积金双边": "说明：个人与单位合计每月进入公积金账户的金额。\n建议值：按工资单真实值填写。\n原因：公积金既影响现金流，也影响房贷/租房场景的真实可用资源。",
        "配偶月度公积金": "说明：配偶月度公积金总额。\n建议值：按工资单实际值填写。\n原因：双收入场景中，公积金对月供缓冲很重要。",
        "公积金提取方式": "说明：公积金优先用于冲抵房贷、房租，或暂不提取。\n建议值：自住有贷家庭可优先冲贷；租房家庭按当地规则冲租。\n原因：用途不同，会影响现金流与账户沉淀。",
        "年提取上限 (元)": "说明：年度可提取公积金的上限。\n建议值：按当地政策填；不确定可先用当前实际年提取额。\n原因：不同城市与用途的可提额度差异很大。",
        "可提取比例": "说明：账户中可实际用于提取或冲抵的比例。\n建议值：保守可先填 50%–100%。\n原因：并非所有公积金余额都能等比例、即时提取。"
    },
    // 房产住房字段提示
    housingFieldTips: {
        "目标房产市值 (元)": "说明：计划购买或持有房产的总价。\n建议值：按成交总价或当前市场合理售价填写。\n原因：房价、首付、贷款和维护费都会围绕这个值联动。",
        "初始贷款总额 (元)": "说明：当前或计划承担的房贷本金余额。\n建议值：与房价、首付比例、家庭资质保持一致。\n原因：贷款额过高会同时推高月供、利息和流动性压力。",
        "购房一次性税费 (元)": "说明：契税、中介费、登记费、装修前置手续费等一次性支出。\n建议值：通常按房价的 1%–5% 粗估，再按真实情况修正。\n原因：这部分会直接侵蚀初始现金，常被忽略。",
        "房产年维护费率": "说明：房屋维护、物业、修缮、持有杂费相对房价的年化比例。\n建议值：可先用 0.1%–0.5%。\n原因：房屋持有成本不仅只有月供。",
        "租房月租预算 (元)": "说明：租房方案下每月租金支出。\n建议值：按当前实际租金或同区域稳定租金中位数填写。\n原因：租房方案对比的核心输入之一。",
        "租金年化涨幅": "说明：租金长期上涨速度。\n建议值：一般可先用 2%–5%。\n原因：租金增速过低会低估长期租房成本。",
        "决策模式": "说明：选择买房与租房对比，或只跑单一方案。\n建议值：首次使用先选对比模式。\n原因：便于先看两种路径差异，再做单方案细化。",
        "城市层级": "说明：用于复杂模式下匹配不同城市的房价与租售特征。\n建议值：按房产所在城市实际层级填写。\n原因：一线与三四线的长期趋势、波动和流动性差异很大。",
        "租售比锚定": "说明：房租与房价关系的参考值，用于复杂模式校准。\n建议值：多数城市可先用 1.5%–3%。\n原因：租售比偏离过大时，买租对比会失真。",
        "政策风险因子": "说明：房产市场受政策变化影响的额外扰动强度。\n建议值：保守 0.05–0.15，稳定期可接近 0。\n原因：限购、限贷、税费、信贷政策都会改变房价路径。",
        "空置风险因子": "说明：房屋空置、出租不顺、流动性不足等风险强度。\n建议值：自住可低些，投资型房产可高些。\n原因：房产并非始终能按账面价值顺利变现或产生收益。",
        "前5年房价年均趋势": "说明：前 1–5 年房价的基础趋势假设。\n建议值：保守可先填 -2% 到 +2%。\n原因：短期房价受周期与政策影响更明显。",
        "5-10年房价恢复趋势": "说明：第 6–10 年房价回归后的趋势。\n建议值：可先填 0%–3%。\n原因：中期趋势通常比短期更平稳。",
        "10年后房价趋势下限": "说明：长期房价增速的保守边界。\n建议值：通常不低于长期通胀附近。\n原因：长期下限决定买房方案的悲观尾部。",
        "10年后房价趋势上限": "说明：长期房价增速的乐观边界。\n建议值：一般比长期通胀高 0–3 个百分点。\n原因：用于限制长期假设过度乐观。",
        "房价波动率": "说明：房价年度波动强度。\n建议值：稳态城市 5%–10%，波动大城市 10%–15%。\n原因：波动率越高，净资产路径分散越大。",
        "房价均值回归强度": "说明：房价偏离长期趋势后回归中枢的力度。\n建议值：0.2–0.5 可作为常见起点。\n原因：值越高，极端上涨/下跌更容易被拉回。"
    },
    // 房贷字段提示
    mortgageFieldTips: {
        "购房月供预算 (元)": "说明：每月计划偿还的房贷金额。\n建议值：不高于家庭月净收入的 30%–40%。\n原因：月供过高会显著提高流动性断裂概率。",
        "房贷年利率": "说明：房贷年化利率。\n建议值：按合同利率填写；测算未来可做 0.5–1 个百分点压力测试。\n原因：利率对总利息和月供都高度敏感。",
        "还款方式": "说明：选择等额本息或等额本金。\n建议值：现金流紧张时常先看等额本息；想更快降本金可看等额本金。\n原因：两者对前期现金流和总利息影响不同。",
        "利率类型": "说明：固定利率保持稳定，浮动利率会随重定价变动。\n建议值：按合同口径填写。\n原因：利率路径会影响未来月供和总成本。",
        "重定价周期 (年)": "说明：浮动利率房贷重定价频率。\n建议值：按合同口径填写，常见为 1 年。\n原因：该值决定利率变化传导到月供的速度。",
        "年终奖额外还贷比": "说明：年终奖中用于提前还贷的比例。\n建议值：保守可从 20%–50% 起。\n原因：比例过高会牺牲流动性，过低又难以改善总利息。",
        "还清后转投资比例": "说明：房贷还清后，原月供中转为投资的比例。\n建议值：70%–100%。\n原因：很多家庭不会把全部释放现金都继续投资，需要留余量。",
        "提前还款策略": "说明：提前还款后，是优先缩短年限还是降低月供。\n建议值：重总利息可偏缩期，重现金流可偏降供。\n原因：两种策略改善家庭财务的方式不同。",
        "提前还款违约金率": "说明：提前还款时的额外费用比例。\n建议值：无则填 0；有条款按合同填。\n原因：会影响提前还款是否真的划算。"
    },
    // 投资组合字段提示
    portfolioFieldTips: {
        "流动资产年化收益": "说明：简单模式下金融资产整体平均收益。\n建议值：保守 3%–6%，积极 6%–8%。\n原因：该值决定租房方案与现金积累的长期速度。",
        "流动资产波动率": "说明：简单模式下金融资产整体波动。\n建议值：保守 8%–15%，权益更高时可到 20%+。\n原因：波动率越高，尾部风险越大。",
        "综合预期收益": "说明：复杂模式下多资产组合的整体收益中枢。\n建议值：与资产配置一致校准，常用 4%–7%。\n原因：收益假设要与风险水平匹配。",
        "综合波动率": "说明：复杂模式下组合年度波动强度。\n建议值：稳健组合 6%–10%，均衡组合 10%–15%。\n原因：它决定净资产分布宽度。",
        "股/房相关性": "说明：股票与房产在周期中的联动程度。\n建议值：0–0.6 可先试。\n原因：相关性越高，分散效果越弱。",
        "现金比例": "说明：组合中现金类资产占比。\n建议值：保守家庭 10%–30%。\n原因：现金越高，波动越小，但长期收益通常更低。",
        "债券比例": "说明：组合中债券类资产占比。\n建议值：可先用 10%–40%。\n原因：债券通常用于平滑波动。",
        "股票比例": "说明：组合中股票类资产占比。\n建议值：长期资金常见 30%–70%。\n原因：股票贡献长期收益，但也带来主要波动。",
        "黄金比例": "说明：组合中黄金占比。\n建议值：0%–15%。\n原因：黄金更多承担对冲和分散功能。",
        "海外比例": "说明：组合中海外资产占比。\n建议值：0%–30%，视汇率与渠道而定。\n原因：海外配置有助于分散单一市场风险。",
        "股票预期收益": "说明：股票资产长期年化收益假设。\n建议值：6%–10%。\n原因：过高会显著抬升模型结果，需谨慎。",
        "股票波动率": "说明：股票资产长期年化波动假设。\n建议值：15%–25%。\n原因：这是尾部风险最主要来源之一。",
        "债券预期收益": "说明：债券资产长期年化收益假设。\n建议值：2%–5%。\n原因：应低于股票、略高于现金。",
        "债券波动率": "说明：债券资产年化波动假设。\n建议值：2%–8%。\n原因：债券通常负责降低组合整体波动。",
        "再平衡模式": "说明：投资组合是定期再平衡、偏离阈值再平衡，还是不再平衡。\n建议值：多数长期组合可先用年度再平衡。\n原因：再平衡能控制风险漂移。",
        "再平衡阈值": "说明：偏离目标配置达到该阈值时再平衡。\n建议值：5% 常见。\n原因：过低会导致频繁调整，过高会失去控制。"
    },
    // 危机宏观字段提示
    crisisFieldTips: {
        "大危机年发生概率": "说明：每年发生系统性风险事件的概率。\n建议值：3%–10%。\n原因：该值直接影响极端情景命中次数。",
        "危机期金融回撤": "说明：危机发生时金融资产额外下跌幅度。\n建议值：-10% 到 -40%。\n原因：用于模拟市场剧烈下跌。",
        "危机期房产下跌": "说明：危机当年房价额外下跌幅度。\n建议值：-5% 到 -20%。\n原因：房产一般比股票慢，但并非无风险。",
        "危机致失业月数": "说明：危机年度中收入中断的月份数。\n建议值：3–9 个月。\n原因：这是家庭现金流尾部风险的关键来源。",
        "危机期年终奖保留率": "说明：危机年份奖金还能保留的比例。\n建议值：20%–70%。\n原因：奖金通常先于固定工资缩水。",
        "年终奖波动率": "说明：年终奖年度波动强度。\n建议值：5%–20%。\n原因：奖金不稳定会改变提前还贷与投资能力。",
        "宏观状态模式": "说明：用简单独立危机，还是状态机模拟经济阶段切换。\n建议值：先用独立危机，进阶再用状态机。\n原因：状态机更真实，但参数更多、理解成本更高。",
        "收入恢复滞后期 (年)": "说明：危机后收入恢复到常态所需年数。\n建议值：1–3 年。\n原因：真实世界里收入恢复通常不是一步到位。"
    },
    // 生命周期字段提示
    lifeEventFieldTips: {
        "起始年 / Start Year": "说明：某项人生事件开始生效的年份。\n建议值：从当前起第几年来写，1 代表第一年。\n原因：用于把大额支出/收入放入正确时间点。",
        "持续年数 / Duration": "说明：事件持续多久。\n建议值：按真实计划填写。\n原因：持续时间会影响累计现金流压力。",
        "年度金额 / Annual Amt": "说明：事件每年带来的净支出或净收入金额。\n建议值：支出填正值，系统会自动按现金流扣减。\n原因：用于模拟育儿、进修、赡养、创业等事件。",
        "增长率 / Growth": "说明：事件金额随时间变化的年增长率。\n建议值：教育、护理等支出通常可高于通胀。\n原因：很多事件不是固定金额。"
    },
    // 保险字段提示
    insuranceFieldTips: {
        "年度总保费 / Annual Premium": "说明：家庭全年保险保费合计。\n建议值：常见可控制在家庭年收入的 3%–10%。\n原因：保费过高会压缩现金流，过低又缺保障。",
        "危机损失抵减 / Crisis Offset": "说明：保险可对冲危机损失的比例。\n建议值：0%–50%。\n原因：用于粗略刻画保险在极端年份的缓冲作用。",
        "重疾险保额 / CI Cover": "说明：重疾险总保额。\n建议值：通常至少覆盖 3–5 年必要支出。\n原因：重疾冲击常来自收入中断与治疗支出。",
        "医疗险报销 / Medical Ratio": "说明：医疗费用的可报销比例。\n建议值：按现有保险条款填写。\n原因：会影响大额医疗事件的现金流冲击。",
        "定期寿险保额 / Term Life": "说明：定寿赔付保额。\n建议值：常见为家庭年支出的 5–10 倍。\n原因：用于覆盖主要收入来源中断风险。",
        "意外险保额 / Accident": "说明：意外险保额。\n建议值：按家庭责任与现有保障缺口配置。\n原因：用于覆盖突发伤残或事故风险。"
    },
    // 分析模块字段提示
    analysisFieldTips: {
        "破产判定 / Ruin Mode": "说明：简单模式只看现金是否跌破阈值，分层模式会更综合。\n建议值：入门先用简单，严谨评估再用分层。\n原因：分层模式更贴近真实家庭压力。",
        "应急基金月数 / EF Months": "说明：用于判定家庭现金安全垫的月数阈值。\n建议值：6 个月为常见起点，收入不稳可取 9–12 个月。\n原因：比'现金是否为负'更能反映实际风险。",
        "还贷收入比 / DSCR": "说明：债务偿付与收入的安全阈值。\n建议值：月供/收入不高于 30%–40%。\n原因：该指标过高时，压力期更容易出问题。",
        "敏感性分析 / Sensitivity": "说明：批量测试关键参数微调后，结果有多敏感。\n建议值：想看模型最怕什么时开启。\n原因：能快速识别最关键的风险变量。",
        "目标求解 / Goal Seek": "说明：反推要达到目标净资产，大致需要什么起点条件。\n建议值：有明确财富目标时开启。\n原因：便于从'我想达到什么'反推配置和现金流。",
        "步长": "说明：敏感性分析时每次调整参数的幅度。\n建议值：1% 或 0.5% 常见。\n原因：步长太大不细致，太小则难看出差异。",
        "目标净资产 (元)": "说明：目标求解时希望达到的期末净资产。\n建议值：按真实财务目标填写。\n原因：模型会反过来帮助判断收入、配置或起始资金需求。"
    }
};

// 合并所有字段提示
uiSchema.fieldTips = {
    ...uiSchema.uiFieldTips,
    ...uiSchema.baseFieldTips,
    ...uiSchema.incomeFieldTips,
    ...uiSchema.pfFieldTips,
    ...uiSchema.housingFieldTips,
    ...uiSchema.mortgageFieldTips,
    ...uiSchema.portfolioFieldTips,
    ...uiSchema.crisisFieldTips,
    ...uiSchema.lifeEventFieldTips,
    ...uiSchema.insuranceFieldTips,
    ...uiSchema.analysisFieldTips
};

// 按钮提示
uiSchema.buttonTips = {
    "run": "按当前参数启动仿真 / Run the simulation with current settings.",
    "refresh": "使用当前参数重新计算结果 / Recalculate results using current inputs.",
    "reset": "恢复系统默认参数 / Reset all parameters to defaults.",
    "restore": "恢复上一次成功计算时的参数 / Restore the last computed parameter set.",
    "export_cfg": "导出当前配置为 JSON / Export the current configuration as JSON.",
    "import_cfg": "导入此前保存的配置 JSON / Import a previously saved JSON configuration.",
    "export_rs": "导出当前结果摘要 / Export the current result summary."
};

// 模块提示
uiSchema.moduleTips = {
    "基础设定 / Base": "说明：决定整体仿真的时间轴、购买力口径和基本安全垫，是所有模块的底座。",
    "收入税务 / Income": "说明：决定家庭主要现金流来源和税后到手能力，是买房和投资两条路径的共同基础。",
    "公积金 / PF": "说明：公积金会影响可用现金、冲贷/冲租能力与住房成本结构。",
    "房产住房 / Housing": "说明：这里定义买房与租房的核心假设，通常是模型差异最大的来源。",
    "房贷 / Mortgage": "说明：这里决定债务成本、月供压力和提前还款节奏。",
    "投资 / Portfolio": "说明：这里决定闲置资金的增值速度与波动风险。",
    "危机宏观 / Crisis": "说明：这里用于测试失业、市场下跌和宏观冲击下的家庭韧性。",
    "生命周期 / Life Events": "说明：这里可加入育儿、进修、养老、创业等阶段性现金流事件。",
    "保险 / Insurance": "说明：这里用于估算保险保费成本，以及极端事件下的缓冲作用。",
    "分析 / Analysis": "说明：这里控制破产判定、情景对比、敏感性分析和目标求解。"
};

// 指标提示
uiSchema.metricTips = {
    "期末净资产中位数 / Median Final Wealth": "说明：所有模拟路径中居中的期末真实净资产。\n建议：先看它判断'典型结果'，不要只看最乐观值。",
    "期末净资产P10 (悲观) / P10 Bearish": "说明：较差 10% 情况下的结果。\n建议：把它当作家庭抗压底线参考。",
    "期末净资产P90 (乐观) / P90 Bullish": "说明：较好 10% 情况下的结果。\n建议：用于看上行空间，不宜当成基准预期。",
    "破产概率 / Ruin Prob": "说明：模拟路径中触发流动性危机的比例。\n建议：长期最好尽量压到较低水平。",
    "平均危机命中 / Avg Crisis": "说明：在整个仿真期内，平均会经历多少次危机冲击。\n建议：用它理解模型是不是过于乐观。"
};

// ============================================================
// 模块9: 生命事件引擎 (lifeEventEngine)
// ============================================================
const lifeEventEngine = {
    processYear: function(lifeEventsModule, year, currentCash) {
        if (!lifeEventsModule.enabled) return { cashImpact: 0, events: [] };

        let cashImpact = 0;
        const activeEvents = [];

        for (const event of lifeEventsModule.params.events) {
            if (year >= event.start_year && year < event.start_year + event.duration_years) {
                const amount = event.amount_annual * Math.pow(1 + event.growth_rate, year - event.start_year);
                cashImpact -= amount;
                activeEvents.push({ ...event, amount });
            }
        }

        return { cashImpact, events: activeEvents };
    }
};

// ============================================================
// 模块10: 保险引擎 (insuranceEngine)
// ============================================================
const insuranceEngine = {
    processYear: function(insuranceModule, crisis) {
        if (!insuranceModule.enabled) return { premium: 0, crisisOffset: 0 };

        const p = insuranceModule.params;
        const premium = p.annual_premium_total;
        let crisisOffset = 0;
        if (crisis && p.crisis_loss_offset_ratio > 0) {
            crisisOffset = p.crisis_loss_offset_ratio;
        }

        return { premium, crisisOffset };
    }
};
