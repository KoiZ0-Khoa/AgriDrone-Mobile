import { readFileSync } from 'node:fs'
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

// Execute the actual TypeScript modules; only the native platform and HTTP transport are replaced.
const compile = (file) => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const clientUrl = dataUrl(compile('../src/api/client.ts').replace("import { Platform } from 'react-native';", "const Platform = { OS: 'android' };").replace('process.env.EXPO_PUBLIC_API_URL', "'http://test.local'"))
const client = await import(clientUrl)
const api = await import(dataUrl(compile('../src/api/farms.ts').replace("'./client'", JSON.stringify(clientUrl))))
const session = await import(dataUrl(compile('../src/auth/session.ts')))
const { optionalNumber } = await import(dataUrl(compile('../src/farms/validation.ts')))
const { farmCoordinate } = await import(dataUrl(compile('../src/farms/geo.ts')))
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch; client.onUnauthorized() })
const expiresAt = new Date(Date.now() + 3_600_000).toISOString()
const response = (role = 0) => ({ email: 'owner@example.test', fullName: 'Chủ vườn', phone: null, session: { accessToken: 'test-token', expiresAt, tenant: { id: 'tenant', name: 'Đơn vị', code: 'DV', role } }, tenantSelection: null })

test('map translates GeoJSON longitude/latitude in the correct order, including zero coordinates', () => {
  assert.deepEqual(farmCoordinate({ centerPoint: { type: 'Point', coordinates: [108.1, 10.9] } }), { latitude: 10.9, longitude: 108.1 })
  assert.deepEqual(farmCoordinate({ centerPoint: { type: 'Point', coordinates: [0, 0] } }), { latitude: 0, longitude: 0 })
})

test('missing or invalid map coordinates are excluded instead of creating fake markers', () => {
  for (const point of [null, { type: 'Polygon', coordinates: [] }, { type: 'Point', coordinates: [181, 10] }, { type: 'Point', coordinates: [108, 91] }, { type: 'Point', coordinates: [NaN, 10] }, { type: 'Point', coordinates: ['108', 10] }, { type: 'Point', coordinates: [] }]) {
    assert.equal(farmCoordinate({ centerPoint: point }), null)
  }
})

test('login maps all backend tenant-role representations', () => {
  for (const role of [0, 'Owner', 'OWNER']) assert.equal(session.toSession(response(role)).role, 'OWNER')
  for (const role of [1, 'TenantAdmin', 'TENANT_ADMIN']) assert.equal(session.toSession(response(role)).role, 'TENANT_ADMIN')
  for (const role of [2, 'Member', 'MEMBER']) assert.equal(session.toSession(response(role)).role, 'MEMBER')
})
test('multi-tenant login waits for selection, system sessions are not tenant sessions', () => {
  assert.equal(session.toSession({ ...response(), session: null, tenantSelection: { tenants: [] } }), null)
  assert.throws(() => session.toSession({ ...response(), session: { ...response().session, tenant: null } }))
})
test('expired or malformed persisted credentials are rejected', () => {
  const valid = session.toSession(response())
  assert.equal(session.isValidSession(valid), true)
  for (const invalid of [null, {}, { ...valid, expiresAt: 'invalid' }, { ...valid, expiresAt: '2000-01-01' }, { ...valid, tenant: null }, { ...valid, role: 'SYSTEM_ADMIN' }]) assert.equal(session.isValidSession(invalid), false)
  assert.throws(() => session.toSession({ ...response(), session: { ...response().session, expiresAt: '2000-01-01' } }))
})
test('farm management is restricted to Owner and Tenant Admin', () => {
  assert.equal(session.canManageFarms(session.toSession(response(0))), true)
  assert.equal(session.canManageFarms(session.toSession(response(1))), true)
  assert.equal(session.canManageFarms(session.toSession(response(2))), false)
  assert.equal(session.canManageFarms(null), false)
})
test('optional numeric inputs accept Vietnamese decimals and reject invalid coordinates/area', () => {
  assert.equal(optionalNumber(' ', 'Diện tích', 0), null)
  assert.equal(optionalNumber('1,25', 'Diện tích', 0), 1.25)
  assert.equal(optionalNumber('-108.25', 'Kinh độ', -180, 180), -108.25)
  for (const value of ['-1', 'NaN', 'Infinity', '0x10', '1,2,3']) assert.throws(() => optionalNumber(value, 'Diện tích', 0))
  assert.throws(() => optionalNumber('91', 'Vĩ độ', -90, 90))
})
test('tenant-admin picker fetches every page and filters inactive/other roles', async () => {
  const urls = []
  globalThis.fetch = async (url, options) => {
    urls.push(url)
    assert.equal(options.headers.Authorization, 'Bearer token')
    return Response.json(urls.length === 1
      ? { items: [{ id: 'owner', role: 0, status: 0 }, { id: 'locked', role: 1, status: 2 }], hasNextPage: true }
      : { items: [{ id: 'admin', role: 1, status: 0 }, { id: 'inactive', role: 1, status: 1 }], hasNextPage: false })
  }
  assert.deepEqual((await api.getAdmins('token')).map(item => item.id), ['admin'])
  assert.deepEqual(urls, ['http://test.local/tenants/current/users?pageNumber=1&pageSize=100', 'http://test.local/tenants/current/users?pageNumber=2&pageSize=100'])
})
test('only missing assignment is converted to null', async () => {
  globalThis.fetch = async () => Response.json({ errorCode: 'FarmMembership.NotFound' }, { status: 404 })
  assert.equal(await api.getAssignment('token', 'farm', 'user'), null)
  for (const [code, status] of [['FarmMembership.FarmNotFound', 404], ['Tenant.AccessDenied', 403]]) {
    globalThis.fetch = async () => Response.json({ errorCode: code }, { status })
    await assert.rejects(() => api.getAssignment('token', 'farm', 'user'), error => error.code === code && error.status === status)
  }
})
test('assignment create/update sends fixed scope and current concurrency version', async () => {
  for (const version of [null, 4]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://test.local/api/farms/farm/members/user/assignment')
      assert.equal(options.method, 'PUT')
      assert.deepEqual(JSON.parse(options.body), { role: 'MANAGER', accessScope: 'ALL_ZONES', zoneIds: [], expectedVersion: version, reason: 'Lý do' })
      return Response.json({ version: (version ?? 0) + 1 })
    }
    assert.equal((await api.assignManager('token', 'farm', 'user', version, ' Lý do ')).version, (version ?? 0) + 1)
  }
})
test('assignment conflicts preserve the code needed to require reload', async () => {
  globalThis.fetch = async () => Response.json({ errorCode: 'FarmMembership.ConcurrentUpdate' }, { status: 409 })
  await assert.rejects(() => api.assignManager('token', 'farm', 'user', 1, ''), error => error.status === 409 && error.code === 'FarmMembership.ConcurrentUpdate')
})
test('401 expires authenticated sessions but not failed anonymous logins', async () => {
  let expired = 0
  client.onUnauthorized(token => { assert.equal(token, 'token'); expired++ })
  globalThis.fetch = async () => Response.json({}, { status: 401 })
  await assert.rejects(() => client.request('/api/auth/login', { method: 'POST', body: {} }))
  assert.equal(expired, 0)
  await assert.rejects(() => api.getFarms('token'))
  assert.equal(expired, 1)
})
test('health endpoint accepts plain text and farm creation preserves GeoJSON coordinate order', async () => {
  globalThis.fetch = async () => new Response('Healthy')
  assert.equal(await client.checkHealth(), true)
  const farm = { code: 'FARM', name: 'Vườn', address: null, areaHectares: 1, centerPoint: { type: 'Point', coordinates: [108, 10] }, boundary: null }
  globalThis.fetch = async (url, options) => { assert.equal(url, 'http://test.local/api/farms'); assert.deepEqual(JSON.parse(options.body), farm); return Response.json({ farmId: 'farm' }) }
  assert.equal((await api.createFarm('token', farm)).farmId, 'farm')
})
test('request cancellation reaches the fetch signal', async () => {
  const controller = new AbortController()
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  })
  const pending = api.getFarms('token', 1, controller.signal)
  controller.abort()
  await assert.rejects(pending, error => error.name === 'AbortError')
})
