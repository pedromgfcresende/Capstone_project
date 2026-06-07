// Thin API client. In dev, Vite proxies /api -> http://127.0.0.1:8000 (see vite.config.js).
const BASE = import.meta.env.VITE_API_BASE || '/api'

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

export const getSectors = () => get('/sectors')
export const getSector = (id) => get(`/sectors/${id}`)
export const getWorkspace = (id) => get(`/workspaces/${id}`)

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

export const synthesizeWorkspace = (id) => send('POST', `/workspaces/${id}/synthesize`)
export const patchWorkspace = (id, body) => send('PATCH', `/workspaces/${id}`, body)

export const synthesizeSector = (id) => send('POST', `/sectors/${id}/synthesize`)
export const askSector = (id, question) => send('POST', `/sectors/${id}/ask`, { question })
export const patchSector = (id, body) => send('PATCH', `/sectors/${id}`, body)

export const getCrmFacets = () => get('/crm/facets')

export const patchVerification = ({ entityType, entityId, claimKey, status }) =>
  send('PATCH', '/verifications', { entityType, entityId, claimKey, status })

export const getCrmCompanies = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
  const qs = new URLSearchParams(clean).toString()
  return get('/crm/companies' + (qs ? `?${qs}` : ''))
}

export async function uploadCompetitor({ file, title, sectorId, sectorLabel }) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', title)
  if (sectorId) fd.append('sector_id', sectorId)
  if (sectorLabel) fd.append('sector_label', sectorLabel)
  const res = await fetch(BASE + '/uploads/competitor', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`upload failed: ${res.status}`)
  return res.json()
}
