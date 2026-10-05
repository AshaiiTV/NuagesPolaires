import { expect, it } from 'vitest';
import { rateLimitMax } from './rate-limit';

it('B7 : plafond 100000 hors production, toujours 10 en production', () => {
	expect(rateLimitMax({ NP_RATE_LIMIT_MAX: '100000', NODE_ENV: 'test' })).toBe(100000);
	expect(rateLimitMax({ NP_RATE_LIMIT_MAX: '100000', NODE_ENV: 'production' })).toBe(10);
	expect(rateLimitMax({ NP_RATE_LIMIT_MAX: '100000', NETLIFY: 'true' })).toBe(10);
	expect(rateLimitMax({ NP_RATE_LIMIT_MAX: '0' })).toBe(10);
});
