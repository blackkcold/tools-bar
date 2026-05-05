(function (global) {
  function calculateMonthlyPayment(principal, annualRatePercent, months) {
    const pv = Number(principal) || 0;
    const n = Number(months) || 0;
    if (pv <= 0 || n <= 0) {
      return 0;
    }

    const monthlyRate = (Number(annualRatePercent) || 0) / 100 / 12;
    if (Math.abs(monthlyRate) < 1e-12) {
      return pv / n;
    }

    const factor = Math.pow(1 + monthlyRate, n);
    return pv * monthlyRate * factor / (factor - 1);
  }

  function calculateLoanSummary({ commercialPrincipal, commercialRate, providentPrincipal, providentRate, years }) {
    const months = (Number(years) || 0) * 12;
    const commP = Number(commercialPrincipal) || 0;
    const fundP = Number(providentPrincipal) || 0;
    const commMonthly = calculateMonthlyPayment(commP, commercialRate, months);
    const fundMonthly = calculateMonthlyPayment(fundP, providentRate, months);
    const totalMonthly = commMonthly + fundMonthly;
    const totalLoan = commP + fundP;
    const totalPay = totalMonthly * months;
    const totalInterest = totalPay - totalLoan;

    return {
      months,
      commercialMonthly: commMonthly,
      providentMonthly: fundMonthly,
      totalMonthly,
      totalLoan,
      totalPay,
      totalInterest
    };
  }

  global.MortgageCore = {
    calculateMonthlyPayment,
    calculateLoanSummary
  };
})(window);
