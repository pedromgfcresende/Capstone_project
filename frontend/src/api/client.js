// Thin API client. In dev, Vite proxies /api -> http://127.0.0.1:8000 (see vite.config.js).
const BASE = import.meta.env.VITE_API_BASE || '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export const getSectors = () => get('/sectors')
export const getSector = (id) => get(`/sectors/${id}`)
export const getSegment = (id) => get(`/segments/${id}`)

async function send(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = res.status
    try { detail = (await res.json()).detail || detail } catch { /* ignore */ }
    throw new Error(typeof detail === 'string' ? detail : `${method} ${path} failed`)
  }
  return res.json()
}

export const synthesizeSegment = (id) => send('POST', `/segments/${id}/synthesize`)
export const patchSegment = (id, body) => send('PATCH', `/segments/${id}`, body)

export const synthesizeSector = (id) => send('POST', `/sectors/${id}/synthesize`)
export const askSector = (id, question) => send('POST', `/sectors/${id}/ask`, { question })
export const patchSector = (id, body) => send('PATCH', `/sectors/${id}`, body)
export const enrichSector = (id, opts = {}) => send('POST', `/sectors/${id}/enrich`, opts)

export const getCrmFacets = () => get('/crm/facets')
export const analyseCrmCompany = (id) => send('POST', `/crm/companies/${id}/analyse`)

export const patchVerification = ({ entityType, entityId, claimKey, status }) =>
  send('PATCH', '/verifications', { entityType, entityId, claimKey, status })

export const getCrmCompanies = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  const qs = new URLSearchParams(clean).toString()
  return get('/crm/companies' + (qs ? `?${qs}` : ''))
}

// Competitor CSV → builds/extends a Sector (segments derived from the Segment column).
export async function uploadCompetitor({ file, sectorLabel }) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('sector_label', sectorLabel)
  const res = await fetch(BASE + '/uploads/competitor', { method: 'POST', body: fd })
  if (!res.ok) {
    let detail = res.status
    try { detail = (await res.json()).detail || detail } catch { /* ignore */ }
    throw new Error(typeof detail === 'string' ? detail : `upload failed: ${res.status}`)
  }
  return res.json()
}
