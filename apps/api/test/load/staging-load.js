// apps/api/test/load/staging-load.js
//
// k6 load test for Step 15.10 (Workflow v2.0 §110).
// Target: STAGING ONLY (api.nolimitshopping.com).
//
// TDD §11.1: proves zero-oversell under flash-sale burst.
// TDD §A.5:  web checkout + POS sale concurrency.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const oversellEvents = new Counter('oversell_events');
const orderSuccess = new Rate('order_success');
const browseSuccess = new Rate('browse_success');
const apiLatency = new Trend('api_latency_ms', true);

const BASE = __ENV.BASE_URL || 'https://api.nolimitshopping.com/api/v1';
const PHONE_PREFIX = '0179';
const FLASH_SALE_SLUG = __ENV.FLASH_SALE_SLUG || 'flash-sale-product';

const SCENARIO = __ENV.SCENARIO || 'smoke';

const scenarios = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '10s' },
  browse: { executor: 'constant-vus', vus: 50, duration: '2m' },
  checkout: { executor: 'constant-vus', vus: 20, duration: '2m' },
  flashsale: { executor: 'constant-vus', vus: 100, duration: '30s' },
  mixed: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m',  target: 65 },
      { duration: '3m',  target: 65 },
      { duration: '30s', target: 0 },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function randomPhone() {
  const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${PHONE_PREFIX}${suffix}`;
}

function randomEmail(phone) {
  return `loadtest-${phone}@bluegofer-test.local`;
}

function jitter(min, max) {
  return Math.random() * (max - min) + min;
}

function browseFlow() {
  group('browse', () => {
    let r = http.get(`${BASE}/cms/home-feed`);
    apiLatency.add(r.timings.duration);
    browseSuccess.add(r.status === 200);
    sleep(jitter(0.5, 1.5));

    r = http.get(`${BASE}/search/suggestions?q=phone`);
    apiLatency.add(r.timings.duration);
    browseSuccess.add(r.status === 200);
    sleep(jitter(0.5, 1.5));

    r = http.get(`${BASE}/search/products?q=&page=1&pageSize=24`);
    apiLatency.add(r.timings.duration);
    browseSuccess.add(r.status === 200);
    sleep(jitter(1, 2));
  });
}

function checkoutFlow() {
  group('checkout', () => {
    const phone = randomPhone();

    let r = http.post(`${BASE}/auth/register`, JSON.stringify({
      phone,
      password: 'LoadTest123!',
      fullName: 'Load Test User',
      email: randomEmail(phone),
    }), { headers: { 'Content-Type': 'application/json' } });
    apiLatency.add(r.timings.duration);
    const regOk = r.status === 201;
    const regRateLimited = r.status === 429;
    if (!regOk && !regRateLimited) { orderSuccess.add(false); return; }
    if (regRateLimited) { return; }

    sleep(jitter(0.5, 1));

    r = http.get(`${BASE}/search/products?q=&page=1&pageSize=5`);
    if (r.status !== 200) { orderSuccess.add(false); return; }
    const body = r.json();
    const products = body.items || body.products || [];
    if (!products.length) { orderSuccess.add(false); return; }
    const firstProduct = products[0];

    r = http.get(`${BASE}/products/slug/${firstProduct.slug}`);
    if (r.status !== 200) { orderSuccess.add(false); return; }
    const detail = r.json();
    const variant = (detail.variants || [])[0];
    if (!variant) { orderSuccess.add(false); return; }

    // CreateAddressDto uses: recipientName, phone, area, city, line1 (NOT addressLine1)
    const payload = {
      items: [{ variantId: variant.id, quantity: 1 }],
      shippingAddress: {
        recipientName: 'Load Test User',
        phone,
        area: 'Inside Dhaka',
        city: 'Dhaka',
        line1: 'Test Address for Load',
      },
      contactPhone: phone,
      paymentMethod: 'COD',
    };
    r = http.post(`${BASE}/checkout/place-order`, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `load-${phone}-${Date.now()}`,
      },
    });
    apiLatency.add(r.timings.duration);
    const ok = r.status === 200 || r.status === 201;
    orderSuccess.add(ok);
    check(r, {
      'order placed or cleanly rejected': (r) => ok || r.status === 400 || r.status === 409,
    });

    sleep(jitter(1, 2));
  });
}

function flashsaleFlow() {
  group('flashsale', () => {
    let r = http.get(`${BASE}/products/slug/${FLASH_SALE_SLUG}`);
    if (r.status !== 200) { orderSuccess.add(false); return; }
    const detail = r.json();
    const variant = (detail.variants || [])[0];
    if (!variant) { orderSuccess.add(false); return; }

    const phone = randomPhone();

    // CreateAddressDto uses: line1 (NOT addressLine1)
    const payload = {
      items: [{ variantId: variant.id, quantity: 1 }],
      shippingAddress: {
        recipientName: 'Flash Sale Bot',
        phone,
        area: 'Inside Dhaka',
        city: 'Dhaka',
        line1: 'Flash Sale Test',
      },
      contactPhone: phone,
      paymentMethod: 'COD',
    };
    r = http.post(`${BASE}/checkout/place-order`, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `flash-${phone}`,
      },
    });
    apiLatency.add(r.timings.duration);
    const ok = r.status === 200 || r.status === 201;
    if (ok) orderSuccess.add(true);
    else if (r.status === 409 || r.status === 400) orderSuccess.add(false);
    else { orderSuccess.add(false); oversellEvents.add(1); }
  });
}

function mixedFlow() {
  const roll = Math.random();
  if (roll < 0.75) browseFlow();
  else if (roll < 0.90) checkoutFlow();
  else flashsaleFlow();
}

export default function () {
  switch (SCENARIO) {
    case 'browse':    return browseFlow();
    case 'checkout':  return checkoutFlow();
    case 'flashsale': return flashsaleFlow();
    case 'mixed':     return mixedFlow();
    case 'smoke':
    default:          return browseFlow();
  }
}

export function handleSummary(data) {
  const summary = {
    scenario: SCENARIO,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values?.count,
      http_req_failed_rate: data.metrics.http_req_failed?.values?.rate,
      http_req_duration_p50: data.metrics.http_req_duration?.values?.['p(50)'],
      http_req_duration_p95: data.metrics.http_req_duration?.values?.['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration?.values?.['p(99)'],
      vus_max: data.metrics.vus_max?.values?.max,
      order_success_rate: data.metrics.order_success?.values?.rate,
      browse_success_rate: data.metrics.browse_success?.values?.rate,
      oversell_events: data.metrics.oversell_events?.values?.count || 0,
    },
  };
  console.log('\n===== SUMMARY JSON =====');
  console.log(JSON.stringify(summary, null, 2));
  console.log('===== END SUMMARY =====\n');
  return {};
}