import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, test } from 'node:test'
import ts from 'typescript'

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText
const dataUrl = value => `data:text/javascript;base64,${Buffer.from(value).toString('base64')}`
const clientUrl = dataUrl(compile('../src/api/client.ts').replace("import Constants from 'expo-constants';", 'const Constants = {}; const __DEV__ = true;').replace("import { Platform } from 'react-native';", "const Platform = { OS: 'android' };").replace('process.env.EXPO_PUBLIC_API_URL', "'http://test.local'"))
const api = await import(dataUrl(compile('../src/surveys/api.ts').replace("'../api/client'", JSON.stringify(clientUrl))))
const auth = await import(dataUrl(compile('../src/auth/session.ts')))
const flow = await import(dataUrl(compile('../src/surveys/orderWorkflow.ts')))
const schedule = await import(dataUrl(compile('../src/surveys/schedule.ts')))
const paymentsUrl = dataUrl(compile('../src/surveys/paymentWorkflow.ts'))
const payments = await import(paymentsUrl)
const owner = await import(dataUrl(compile('../src/surveys/ownerOrderWorkflow.ts').replace("'./paymentWorkflow'", JSON.stringify(paymentsUrl))))
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const orderId = '10000000-0000-0000-0000-000000000001', appointmentId = '20000000-0000-0000-0000-000000000001'

test('System Manager signs in and restores a system session without inventing a tenant; Admin remains web only', () => {
  const token = role => `header.${Buffer.from(JSON.stringify({ system_role: role })).toString('base64url')}.signature`
  const response = role => ({ email: 'manager@example.test', fullName: 'Nam', phone: null, tenantSelection: null, session: { accessToken: token(role), expiresAt: '2099-01-01T00:00:00Z', tenant: null } })
  for (const role of ['SYSTEM_MANAGER', ['SYSTEM_MANAGER']]) {
    const result = auth.toSession(response(role))
    assert.equal(result.role, 'SYSTEM_MANAGER'); assert.equal(result.tenant, null); assert.equal(auth.isValidSession(result), true); assert.equal(auth.canManageFarms(result), false)
    assert.equal(auth.isValidSession({ ...result, tenant: { id: 'made-up' } }), false)
    assert.equal(auth.isValidSession({ ...result, expiresAt: 'invalid' }), false)
    assert.equal(auth.isValidSession({ ...result, accessToken: token('MEMBER') }), false)
  }
  for (const role of ['SYSTEM_ADMIN', ['SYSTEM_MANAGER', 'SYSTEM_ADMIN'], 'UNKNOWN']) assert.throws(() => auth.toSession(response(role)))
})

test('assigned orders paginate, preserve versions and normalize reschedule requests; detail scans every page', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url), page = parsed.searchParams.get('pageNumber')
    calls.push(page)
    assert.equal(parsed.pathname, '/api/system-manager/survey-orders'); assert.equal(options.headers.Authorization, 'Bearer manager')
    return Response.json({ items: page === '1' ? [] : [{ surveyOrderId: orderId, orderVersion: 19, currentAppointmentStatus: 'RESCHEDULEREQUESTED' }], pageNumber: Number(page), hasNextPage: page === '1' })
  }
  const result = await api.getAssignedOrder('manager', orderId)
  assert.deepEqual(calls, ['1', '2']); assert.equal(result.orderVersion, 19); assert.equal(result.currentAppointmentStatus, 'RESCHEDULE_REQUESTED')
  assert.equal(await api.getAssignedOrder('manager', 'unknown'), null)
})

test('Vietnam schedule input rejects normalized invalid dates and sends latest order and reschedule versions', () => {
  assert.equal(schedule.vietnamDateTime('2026-11-10', '08:30'), '2026-11-10T01:30:00.000Z')
  for (const [date, time] of [['2026-02-30', '08:30'], ['2026-11-10', '24:00'], ['10/11/2026', '08:30'], ['', '']]) assert.throws(() => schedule.vietnamDateTime(date, time))
  const scope = { surveyOrderId: orderId, tenantId: 'tenant', farmId: 'farm', orderVersion: 10, orderStatus: 'AWAITING_BASELINE_APPOINTMENT', requiresBaselineMapping: true }
  const order = { ...scope, status: scope.orderStatus, currentAppointmentId: appointmentId, currentAppointmentVersion: 7, currentAppointmentStatus: 'RESCHEDULE_REQUESTED' }
  const body = flow.appointmentBody(order, scope, '2099-01-01T01:00:00Z', '2099-01-01T02:00:00Z')
  assert.equal(body.expectedCurrentAppointmentVersion, 7); assert.equal(body.expectedOrderVersion, 10); assert.equal(body.expectedCurrentAppointmentId, appointmentId)
  assert.throws(() => flow.appointmentBody(order, { ...scope, orderVersion: 11 }, '2099-01-01T01:00:00Z', '2099-01-01T02:00:00Z'))
})

test('Owner appointment confirmation and reschedule use Owner routes and preserve both versions', async () => {
  for (const [run, suffix, extra] of [[api.confirmOwnerAppointment, 'confirm', {}], [api.requestOwnerReschedule, 'request-reschedule', { reason: 'Đổi lịch' }]]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `http://test.local/api/tenant-owner/survey-orders/${orderId}/appointments/${appointmentId}/${suffix}`)
      assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), { expectedOrderVersion: 31, expectedAppointmentVersion: 8, ...extra })
      return Response.json({ orderVersion: 32 })
    }
    await run('owner', orderId, appointmentId, { expectedOrderVersion: 31, expectedAppointmentVersion: 8, ...extra })
  }
})

test('intake requests include idempotency headers and use public or authenticated Owner routes', async () => {
  const body = { surveyServiceId: 'service', farmName: 'Tam Vu', approximateAreaHa: 2.5123, longitude: 108.123456, latitude: 10.123456, estimatedPoleCount: null, notes: null, preferredStartAt: null, preferredEndAt: null }
  for (const [run, path, cookie] of [[() => api.submitPublicRequest(body, 'same-operation'), '/api/public/survey-requests', true], [() => api.submitSurveyRequest('owner', undefined, body, 'same-operation'), '/api/tenant-owner/survey-requests/new-farm', false], [() => api.submitSurveyRequest('owner', 'farm/id', body, 'same-operation'), '/api/tenant-owner/farms/farm%2Fid/survey-requests', false]]) {
    globalThis.fetch = async (url, options) => { assert.equal(new URL(url).pathname, path); assert.equal(options.headers['Idempotency-Key'], 'same-operation'); assert.deepEqual(JSON.parse(options.body), body); if (cookie) assert.equal(options.credentials, 'include'); else assert.equal(options.headers.Authorization, 'Bearer owner'); return Response.json({ id: orderId }) }
    await run()
  }
})

test('payment eligibility requires current confirmed appointment and matching history; paid or processing items block duplicate payment', async () => {
  const order = { surveyOrderId: orderId, orderVersion: 13, status: 'AWAITING_BASELINE_DEPOSIT', depositAmount: 10000, remainingAmount: null, currency: 'VND', currentAppointment: { appointmentId, appointmentVersion: 6, purpose: 'BASELINE_MAPPING', status: 'CONFIRMED', startAt: '2099-01-01T00:00:00Z', endAt: '2099-01-02T00:00:00Z' } }
  const history = { surveyOrderId: orderId, payments: [] }
  assert.deepEqual(owner.ownerPaymentBody(order, history), { expectedOrderVersion: 13, purpose: 'BASELINE_DEPOSIT' })
  for (const status of ['PROCESSING', 'PENDING', 'PAID', 'CONFIRMED']) assert.equal(owner.canInitiateOwnerPayment(order, { ...history, payments: [{ purpose: 'BASELINE_DEPOSIT', status }] }), false)
  assert.equal(owner.canInitiateOwnerPayment(order, { ...history, surveyOrderId: 'wrong' }), false)
  assert.equal(owner.canInitiateOwnerPayment({ ...order, currentAppointment: { ...order.currentAppointment, status: 'PROPOSED' } }, history), false)
  const session = { surveyOrderId: orderId, amount: 10000, paymentStatus: 'PROCESSING', expiresAt: '2099-01-01T00:00:00Z', redirectUrl: 'https://checkout.example.test/payment' }
  assert.equal(payments.paymentCheckoutUrl(session, orderId), session.redirectUrl)
  assert.throws(() => payments.paymentCheckoutUrl({ ...session, redirectUrl: 'javascript:alert(1)' }, orderId))
  assert.throws(() => payments.paymentCheckoutUrl({ ...session, surveyOrderId: 'wrong' }, orderId))
  assert.equal(payments.paymentCheckoutUrl({ ...session, paymentStatus: 'PAID' }, orderId), null)
  globalThis.fetch = async () => Response.json({ surveyOrderId: 'wrong', payments: [] })
  await assert.rejects(api.getPaymentHistory('owner', orderId), /không khớp/)
})
