import handler from '../../pages/api/catalog'
import httpMocks from 'node-mocks-http'

describe('Catalog API', () => {
  test('GET /api/catalog returns results', async () => {
    const req = httpMocks.createRequest({ method: 'GET', url: '/api/catalog', query: { text: 'laser', techBase: 'Inner Sphere', unitType: 'BattleMech', page: '1', pageSize: '10' } })
    const res = httpMocks.createResponse()

    // @ts-ignore
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const data = res._getJSONData()
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)
  })
})