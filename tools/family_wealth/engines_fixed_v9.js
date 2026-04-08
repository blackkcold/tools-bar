// ============================================================
// engines.js - Math utils, tax, housing, mortgage, portfolio,
//             crisis, scenario runner, simulation engine
// ============================================================

function boxMuller() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function getPercentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(idx, sorted.length - 1)];
}

function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function chinaIndividualIncomeTax(annualTaxableIncome) {
    let taxable = Math.max(0.0, annualTaxableIncome);
    const brackets = [36000, 144000, 300000, 420000, 660000, 960000];
    const rates = [0.03, 0.10, 0.20, 0.25, 0.30, 0.35, 0.45];
    const quick = [0, 2520, 16920, 31920, 52920, 85920, 181920];

    if (taxable <= brackets[0]) return taxable * rates[0] - quick[0];
    if (taxable <= brackets[1]) return taxable * rates[1] - quick[1];
    if (taxable <= brackets[2]) return taxable * rates[2] - quick[2];
    if (taxable <= brackets[3]) return taxable * rates[3] - quick[3];
    if (taxable <= brackets[4]) return taxable * rates[4] - quick[4];
    if (taxable <= brackets[5]) return taxable * rates[5] - quick[5];
    return taxable * rates[6] - quick[6];
}

function personAfterTaxIncome(annualSalary, annualBonus, annualPf, annualTaxCredit, personalStandardDeduction) {
    const gross = annualSalary + annualBonus;
    const taxableIncome = Math.max(0.0, gross - annualPf - personalStandardDeduction - annualTaxCredit);
    const tax = chinaIndividualIncomeTax(taxableIncome);
    return { afterTax: gross - tax, tax };
}

const taxEngine = {
    calculate: function(incomeTaxModule, mainSalary, mainBonus, mainPf, spouseSalary, spouseBonus, spousePf, spouseTaxCredit) {
        const params = incomeTaxModule.params;
        const personalDed = params.personal_standard_deduction_annual;

        let mainAfterTax, spouseAfterTax;

        if (params.bonus_tax_mode === 'separate') {
            mainAfterTax = personAfterTaxIncome(mainSalary, 0, mainPf, params.main_tax_credit_annual, personalDed);
            const mainBonusTax = chinaIndividualIncomeTax(mainBonus - params.main_tax_credit_annual) * 0.5;
            mainAfterTax.afterTax += mainBonus - mainBonusTax;

            if (spouseSalary > 0) {
                spouseAfterTax = personAfterTaxIncome(spouseSalary, 0, spousePf, spouseTaxCredit, personalDed);
                const spouseBonusTax = chinaIndividualIncomeTax(spouseBonus - spouseTaxCredit) * 0.5;
                spouseAfterTax.afterTax += spouseBonus - spouseBonusTax;
            } else {
                spouseAfterTax = { afterTax: 0, tax: 0 };
            }
        } else {
            mainAfterTax = personAfterTaxIncome(mainSalary, mainBonus, mainPf, params.main_tax_credit_annual, personalDed);
            spouseAfterTax = spouseSalary > 0
                ? personAfterTaxIncome(spouseSalary, spouseBonus, spousePf, spouseTaxCredit, personalDed)
                : { afterTax: 0, tax: 0 };
        }

        return {
            mainAfterTax,
            spouseAfterTax,
            totalAfterTax: mainAfterTax.afterTax + spouseAfterTax.afterTax
        };
    }
};

const housingEngine = {
    getTrendByYear: function(housingModule, yearIndex) {
        const p = housingModule.params;
        if (yearIndex <= 5) {
            return p.early_house_trend;
        } else if (yearIndex <= 10) {
            const progress = (yearIndex - 5) / 5;
            return p.early_house_trend + (p.recovery_house_trend - p.early_house_trend) * progress;
        } else if (yearIndex <= 15) {
            const matureMid = (p.mature_house_trend_low + p.mature_house_trend_high) / 2;
            const progress = (yearIndex - 10) / 5;
            return p.recovery_house_trend + (matureMid - p.recovery_house_trend) * progress;
        } else {
            return (p.mature_house_trend_low + p.mature_house_trend_high) / 2;
        }
    },

    getReturns: function(housingModule, yearIndex) {
        const houseTrend = this.getTrendByYear(housingModule, yearIndex);
        const z1 = boxMuller();
        const z2 = boxMuller();
        const p = housingModule.params;
        const corr = Math.max(-0.95, Math.min(0.95, Number(p.correlation ?? 0)));

        const x1 = z1;
        const x2 = corr * z1 + Math.sqrt(Math.max(0, 1 - corr * corr)) * z2;

        const rawHouseRet = houseTrend + p.house_sigma * x2;
        const houseRet = houseTrend + (1 - p.house_mean_reversion) * (rawHouseRet - houseTrend);

        return { houseTrend, houseRet };
    }
};

const mortgageEngine = {
    runOneYear: function(mortgageModule, loanBal, annualBonusRepay) {
        const p = mortgageModule.params;
        const monthlyRate = p.mortgage_annual_rate / 12;
        let paymentMonths = 0;
        let annualInterestPaid = 0;
        let annualPrincipalPaid = 0;
        let freedCashAfterPayoff = 0;

        for (let m = 0; m < 12; m++) {
            if (loanBal <= 0) {
                freedCashAfterPayoff += p.monthly_emi * p.post_mortgage_invest_ratio;
            } else {
                const interest = loanBal * monthlyRate;
                const scheduledPayment = Math.min(p.monthly_emi, loanBal + interest);
                const principal = Math.max(0.0, scheduledPayment - interest);
                loanBal = Math.max(0.0, loanBal - principal);
                annualInterestPaid += interest;
                annualPrincipalPaid += principal;
                paymentMonths++;
            }
        }

        let bonusRepayApplied = 0;
        if (loanBal > 0 && annualBonusRepay > 0) {
            bonusRepayApplied = Math.min(loanBal, annualBonusRepay);
            loanBal -= bonusRepayApplied;
            annualPrincipalPaid += bonusRepayApplied;
        }

        return {
            loanBalEnd: loanBal,
            annualInterestPaid,
            annualPrincipalPaid,
            paymentMonths,
            freedCashAfterPayoff,
            bonusRepayApplied
        };
    }
};

const portfolioEngine = {
    getReturns: function(portfolioModule, yearIndex) {
        const p = portfolioModule.params;

        if (portfolioModule.mode === 'simple') {
            const z = boxMuller();
            return p.invest_mu + p.invest_sigma * z;
        } else {
            const z1 = boxMuller();
            const z2 = boxMuller();

            const x1 = z1;
            const x2 = p.correlation * z1 + Math.sqrt(Math.max(0, 1 - p.correlation * p.correlation)) * z2;

            const equityRet = p.equity_mu + p.equity_sigma * x1;
            const bondRet = p.bond_mu + p.bond_sigma * x2;
            const cashRet = p.cash_mu + p.cash_sigma * boxMuller();
            const goldRet = p.gold_mu + p.gold_sigma * boxMuller();
            const overseasRet = p.overseas_mu + p.overseas_sigma * boxMuller();

            const totalRet = (
                equityRet * p.equity_alloc +
                bondRet * p.bond_alloc +
                cashRet * p.cash_alloc +
                goldRet * p.gold_alloc +
                overseasRet * p.overseas_alloc
            );

            return totalRet;
        }
    },

    rebalance: function(portfolioModule, currentAlloc, totalValue) {
        if (portfolioModule.params.rebalance_mode === 'none') return {};
        const threshold = portfolioModule.params.rebalance_threshold || 0.05;
        return {};
    }
};

const crisisEngine = {
    checkCrisis: function(crisisModule) {
        return Math.random() < crisisModule.params.crisis_prob;
    },

    applyCrisisImpact: function(crisisModule, cash, houseVal, buyHouse, mainSalary, mainBonus, spouseSalary, spouseBonus) {
        const p = crisisModule.params;
        const crisis = this.checkCrisis(crisisModule);

        let newCash = cash;
        let newHouseVal = houseVal;
        let newMainSalary = mainSalary;
        let newMainBonus = mainBonus;

        if (crisis) {
            newCash *= (1 + p.crisis_cash_drawdown);
            if (buyHouse && newHouseVal > 0) {
                newHouseVal *= (1 + p.crisis_house_drawdown);
            }
            newMainSalary = mainSalary * Math.max(0, 12 - p.unemployment_months) / 12;
            newMainBonus = mainBonus * p.bonus_cut_ratio_in_crisis;
        }

        return { crisis, newCash, newHouseVal, newMainSalary, newMainBonus };
    }
};

const scenarioRunner = {
    scenarios: {
        base: { inflation: 0.025, invest_mu: 0.055, crisis_prob: 0.06 },
        high_inflation: { inflation: 0.04, invest_mu: 0.06, crisis_prob: 0.06 },
        housing_downturn: { inflation: 0.03, invest_mu: 0.04, house_sigma: 0.12 },
        low_growth: { inflation: 0.015, invest_mu: 0.035, salary_growth: 0.015 },
        job_loss: { crisis_prob: 0.12, unemployment_months: 9 },
        bull_market: { inflation: 0.025, invest_mu: 0.09, invest_sigma: 0.22 },
        double_shock: { crisis_prob: 0.15, crisis_cash_drawdown: -0.35, inflation: 0.035 }
    },

    runScenario: function(baseConfig, scenarioName, years, nSims) {
        const scenario = this.scenarios[scenarioName];
        if (!scenario) return null;

        const simConfig = JSON.parse(JSON.stringify(baseConfig));

        for (const [key, value] of Object.entries(scenario)) {
            if (key in simConfig.base) simConfig.base[key] = value;
            if (key in simConfig.portfolio_module.params) simConfig.portfolio_module.params[key] = value;
            if (key in simConfig.crisis_module.params) simConfig.crisis_module.params[key] = value;
            if (key in simConfig.housing_module.params) simConfig.housing_module.params[key] = value;
        }

        const results = simulationEngine.runFullSimulation(simConfig, years, nSims);
        return { scenario: scenarioName, results };
    },

    runAllScenarios: function(baseConfig, selectedScenarios, years, nSims) {
        const results = {};
        for (const scenarioName of selectedScenarios) {
            results[scenarioName] = this.runScenario(baseConfig, scenarioName, years, nSims);
        }
        return results;
    }
};

const simulationEngine = {
    simulateOnePath: function(cfg, buyHouse, dualIncome) {
        const { base, income_tax_module, pf_module, housing_module, mortgage_module, portfolio_module, crisis_module, life_events_module, insurance_module } = cfg;

        let cash, houseVal, loanBal;
        if (buyHouse) {
            cash = base.start_cash;
            houseVal = housing_module.params.house_price;
            loanBal = housing_module.params.loan_balance;
            const downPayment = housing_module.params.house_price - housing_module.params.loan_balance;
            cash -= (downPayment + housing_module.params.purchase_tax_and_fees);
        } else {
            cash = base.start_cash;
            houseVal = 0;
            loanBal = 0;
        }

        let ruined = false;
        let ruinYear = null;
        let crisisCount = 0;
        let trace = [];
        let loanFreeYear = null;
        let cumulativeDiscountedRent = 0;

        for (let y = 1; y <= cfg.meta.years; y++) {
            const investRet = portfolioEngine.getReturns(portfolio_module, y);

            const { crisis, newCash, newHouseVal, newMainSalary, newMainBonus } =
                crisisEngine.applyCrisisImpact(crisis_module, cash, houseVal, buyHouse, 0, 0, 0, 0);

            if (crisis) crisisCount++;
            cash = newCash;
            if (buyHouse) houseVal = newHouseVal;

            const salaryFactor = Math.pow(1 + income_tax_module.params.main_salary_growth, y);
            const spouseSalaryFactor = dualIncome ? Math.pow(1 + income_tax_module.params.spouse_salary_growth, y) : 0;
            const bonusFactor = Math.pow(1 + 0.02, y);

            let curSalaryMonthly = income_tax_module.params.main_monthly_salary * salaryFactor;
            let curPfMonthly = pf_module.params.main_monthly_pf * salaryFactor;
            let curBonusTrend = income_tax_module.params.main_annual_bonus * bonusFactor;
            let bonusShockMain = Math.max(-0.95, boxMuller() * crisis_module.params.annual_bonus_volatility);
            let curBonus = curBonusTrend * (1 + bonusShockMain);

            let spouseSalaryMonthly = dualIncome ? income_tax_module.params.spouse_monthly_salary * spouseSalaryFactor : 0;
            let spousePfMonthly = dualIncome ? pf_module.params.spouse_monthly_pf * spouseSalaryFactor : 0;
            let spouseBonusTrend = dualIncome ? income_tax_module.params.spouse_annual_bonus * bonusFactor : 0;
            let bonusShockSpouse = dualIncome ? Math.max(-0.95, boxMuller() * crisis_module.params.annual_bonus_volatility) : 0;
            let spouseBonus = spouseBonusTrend * (1 + bonusShockSpouse);

            if (crisis) {
                const unemploymentFactor = Math.max(0, 12 - crisis_module.params.unemployment_months) / 12;
                curSalaryMonthly *= unemploymentFactor;
                spouseSalaryMonthly *= unemploymentFactor;
                curBonus *= crisis_module.params.bonus_cut_ratio_in_crisis;
                spouseBonus *= crisis_module.params.bonus_cut_ratio_in_crisis;
            }

            const mainSalaryAnnual = curSalaryMonthly * 12;
            const mainBonusAnnual = curBonus;
            const spouseSalaryAnnual = spouseSalaryMonthly * 12;
            const spouseBonusAnnual = spouseBonus;
            const mainPfAnnual = curPfMonthly * 12;
            const spousePfAnnual = spousePfMonthly * 12;

            const { totalAfterTax, mainAfterTax, spouseAfterTax } = taxEngine.calculate(
                income_tax_module, mainSalaryAnnual, mainBonusAnnual, mainPfAnnual,
                spouseSalaryAnnual, spouseBonusAnnual, spousePfAnnual,
                dualIncome ? income_tax_module.params.spouse_tax_credit_annual : 0
            );

            const annualPfTotal = mainPfAnnual + spousePfAnnual;
            const activeBonusTotal = mainBonusAnnual + spouseBonusAnnual;

            const annualLivingCost = base.annual_living_cost * Math.pow(1 + base.living_cost_growth, y);

            cash *= (1 + investRet);

            if (buyHouse) {
                const { houseRet } = housingEngine.getReturns(housing_module, y);
                houseVal *= (1 + houseRet);
                const annualHouseMaintenance = Math.max(0.0, houseVal) * housing_module.params.annual_house_maintenance_ratio;

                const bonusRepayBudget = (loanBal > 0) ? activeBonusTotal * mortgage_module.params.extra_repay_bonus_ratio : 0;
                const mortgagePack = mortgageEngine.runOneYear(mortgage_module, loanBal, bonusRepayBudget);
                loanBal = mortgagePack.loanBalEnd;

                cash += (
                    totalAfterTax
                    + annualPfTotal
                    - mortgagePack.annualInterestPaid
                    - mortgagePack.annualPrincipalPaid
                    - annualLivingCost
                    - annualHouseMaintenance
                    + mortgagePack.freedCashAfterPayoff
                );

                if (loanBal <= 0 && loanFreeYear === null) {
                    loanFreeYear = (y - 1) + mortgagePack.paymentMonths / 12;
                }
            } else {
                const rentAnnual = housing_module.params.monthly_rent * Math.pow(1 + housing_module.params.rent_growth_anchor, y) * 12;
                const discountedRentAnnual = rentAnnual / Math.pow(1 + base.inflation, y);
                cumulativeDiscountedRent += discountedRentAnnual;
                const annualCashInflow = totalAfterTax + annualPfTotal;
                cash += annualCashInflow - rentAnnual - annualLivingCost;
            }

            const { cashImpact: eventImpact } = lifeEventEngine.processYear(life_events_module, y, cash);
            cash += eventImpact;

            const { premium: insurancePremium } = insuranceEngine.processYear(insurance_module, crisis);
            cash -= insurancePremium;

            if (cash < base.min_cash_buffer && !ruined) {
                ruined = true;
                ruinYear = y;
            }

            if (!Number.isFinite(cash) || !Number.isFinite(houseVal) || !Number.isFinite(loanBal)) {
                throw new Error(`Non-finite state at year ${y}: cash=${cash}, house=${houseVal}, loan=${loanBal}`);
            }

            const totalNominal = cash + (buyHouse ? Math.max(0, houseVal - loanBal) : 0);
            const totalReal = totalNominal / Math.pow(1 + base.inflation, y);
            trace.push({ year: y, totalReal, totalNominal });
        }

        const finalNominal = cash + (buyHouse ? Math.max(0, houseVal - loanBal) : 0);
        const finalReal = finalNominal / Math.pow(1 + base.inflation, cfg.meta.years);

        return {
            finalNominal,
            finalReal,
            ruined,
            ruinYear,
            crisisCount,
            loanFreeYear,
            trace,
            finalCash: cash,
            finalHouseVal: houseVal,
            finalLoanBal: loanBal,
            cumulativeDiscountedRent
        };
    },

    summarizeResults: function(results, years) {
        const realVals = results.map(r => r.finalReal);
        const nominalVals = results.map(r => r.finalNominal);
        const ruinedFlags = results.map(r => r.ruined ? 1 : 0);
        const ruinYears = results.map(r => r.ruinYear).filter(y => y !== null);
        const crisisCounts = results.map(r => r.crisisCount);
        const loanFreeYears = results.map(r => r.loanFreeYear).filter(y => y !== null && !isNaN(y));

        realVals.sort((a, b) => a - b);
        nominalVals.sort((a, b) => a - b);

        const medianTrace = [];
        const p10Trace = [], p90Trace = [];
        for (let y = 0; y < years; y++) {
            const yearVals = results.map(r => r.trace[y].totalReal / 10000);
            yearVals.sort((a, b) => a - b);
            medianTrace.push(getPercentile(yearVals, 0.5));
            p10Trace.push(getPercentile(yearVals, 0.1));
            p90Trace.push(getPercentile(yearVals, 0.9));
        }

        return {
            mean_nominal_wan: mean(nominalVals) / 10000,
            median_nominal_wan: getPercentile(nominalVals, 0.5) / 10000,
            mean_real_wan: mean(realVals) / 10000,
            median_real_wan: getPercentile(realVals, 0.5) / 10000,
            p10_real_wan: getPercentile(realVals, 0.1) / 10000,
            p25_real_wan: getPercentile(realVals, 0.25) / 10000,
            p75_real_wan: getPercentile(realVals, 0.75) / 10000,
            p90_real_wan: getPercentile(realVals, 0.9) / 10000,
            ruin_probability: mean(ruinedFlags),
            avg_ruin_year: ruinYears.length > 0 ? mean(ruinYears) : NaN,
            avg_crisis_count: mean(crisisCounts),
            avg_loan_free_year: loanFreeYears.length > 0 ? mean(loanFreeYears) : NaN,
            median_trace: medianTrace,
            p10_trace: p10Trace,
            p90_trace: p90Trace
        };
    },

    computeAssetComposition: function(buyResults, rentResults, years, inflation) {
        const inflationFactor = Math.pow(1 + inflation, years);

        const buyCashArr = buyResults.map(r => (r.finalCash || 0) / inflationFactor / 10000).sort((a, b) => a - b);
        const buyEquityArr = buyResults.map(r => Math.max(0, (r.finalHouseVal || 0) - (r.finalLoanBal || 0)) / inflationFactor / 10000).sort((a, b) => a - b);
        const rentCashArr = rentResults.map(r => (r.finalCash || 0) / inflationFactor / 10000).sort((a, b) => a - b);
        const discountedRentArr = rentResults.map(r => (r.cumulativeDiscountedRent || 0) / 10000).sort((a, b) => a - b);

        const buyMedianCash = getPercentile(buyCashArr, 0.5);
        const buyMedianEquity = getPercentile(buyEquityArr, 0.5);
        const rentMedianCash = getPercentile(rentCashArr, 0.5);
        const discountedRentMedian = getPercentile(discountedRentArr, 0.5);

        return {
            buy: {
                cashWan: (buyMedianCash || 0).toFixed(2),
                equityWan: (buyMedianEquity || 0).toFixed(2),
                totalWan: ((buyMedianCash || 0) + (buyMedianEquity || 0)).toFixed(2)
            },
            rent: {
                cashWan: (rentMedianCash || 0).toFixed(2),
                rentCostWan: (discountedRentMedian || 0).toFixed(2),
                totalWan: (rentMedianCash || 0).toFixed(2)
            }
        };
    },

    computeCostComparison: function(cfg, years) {
        const buy = [];
        const rent = [];
        const inflation = cfg.base.inflation;
        
        // 首付+税费（第0年，不折现）
        let cumBuy = Math.max(0, (cfg.housing_module.params.house_price - cfg.housing_module.params.loan_balance) + cfg.housing_module.params.purchase_tax_and_fees);
        let cumRent = 0;
        
        for (let y = 1; y <= years; y++) {
            const discountFactor = Math.pow(1 + inflation, y);
            
            const annualLivingCost = cfg.base.annual_living_cost * Math.pow(1 + cfg.base.living_cost_growth, y);
            const annualMaintBase = cfg.housing_module.params.house_price * Math.pow(1 + (cfg.housing_module.params.recovery_house_trend || 0), Math.max(0, y-1));
            const annualMaint = Math.max(0, annualMaintBase) * cfg.housing_module.params.annual_house_maintenance_ratio;
            const annualMortgage = Math.min(cfg.mortgage_module.params.monthly_emi * 12, Math.max(0, cfg.housing_module.params.loan_balance));
            
            // 折现到当前购买力
            const discountedBuyCost = (annualMortgage + annualMaint + annualLivingCost) / discountFactor;
            cumBuy += discountedBuyCost;
            
            const annualRent = cfg.housing_module.params.monthly_rent * Math.pow(1 + cfg.housing_module.params.rent_growth_anchor, y) * 12;
            const discountedRentCost = (annualRent + annualLivingCost) / discountFactor;
            cumRent += discountedRentCost;
            
            buy.push((cumBuy / 10000).toFixed(2) * 1);
            rent.push((cumRent / 10000).toFixed(2) * 1);
        }
        return { buy, rent };
    },

    computeCrisisDistribution: function(results) {
        const counts = {};
        for (const r of results) {
            const count = r.crisisCount || 0;
            counts[count] = (counts[count] || 0) + 1;
        }
        return counts;
    },

    runFullSimulation: function(appConfig, years, nSims) {
        const buyArr = [], rentArr = [];
        const dualIncome = appConfig.meta.household_mode === 'dual_income';

        for (let i = 0; i < nSims; i++) {
            buyArr.push(this.simulateOnePath(appConfig, true, dualIncome));
            rentArr.push(this.simulateOnePath(appConfig, false, dualIncome));
        }

        const buySummary = this.summarizeResults(buyArr, years);
        const rentSummary = this.summarizeResults(rentArr, years);
        const composition = this.computeAssetComposition(buyArr, rentArr, years, appConfig.base.inflation);
        const crisisDist = this.computeCrisisDistribution(buyArr);

        return {
            buy_house: buySummary,
            rent_house: rentSummary,
            summary: { buy_house: buySummary, rent_house: rentSummary },
            traces: { buy_house: buyArr, rent_house: rentArr },
            composition,
            crisisDistribution: crisisDist,
            diagnostics: {
                ruin_prob_buy: buySummary.ruin_probability,
                ruin_prob_rent: rentSummary.ruin_probability
            }
        };
    }
};
