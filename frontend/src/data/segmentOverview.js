// Empty-shape default for the segment market overview. Real values come from the
// backend AI synthesis (workspace.synthesis.overview.market); this only guarantees
// the shape so the Overview tab can render before/without synthesis.
export const FALLBACK_OVERVIEW = {
  thesis: '', tam: '', sam: '', som: '', cagr: '', maturity: '', dataDate: '',
  tailwinds: [], headwinds: [], whyNow: [], recentMA: [], newEntrants: [],
  regulatory: [], adoptionStage: '', adoptionEvidence: '', exits: [],
  tamFlag: false, samFlag: false, somFlag: false,
}
