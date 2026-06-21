// Maps a company's real backend fields onto the shape the CompanyProfile modal
// renders. There is no backend source for a funding-history timeline, a people
// roster, or core metrics yet, so those are intentionally omitted — the modal
// only renders what the company record actually carries (trust model: no faked
// or placeholder values).
export function getProfile(company) {
  const investors = String(company.topInvestors || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    totalRaised: company.raised || null,
    latestRound: company.fundRound
      ? { stage: company.fundRound, amount: company.fundingAmount || null, date: null }
      : null,
    investors,
  }
}
