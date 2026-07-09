import { describe, expect, it } from 'vitest';
import { InMemorySlidingWindowStore } from './rate-limit';

describe('InMemorySlidingWindowStore', () => {
	const options = { limit: 3, windowMs: 1000 };

	it('allows requests up to the limit and blocks the next one', () => {
		const store = new InMemorySlidingWindowStore();

		expect(store.hit('ip', options, 0).allowed).toBe(true);
		expect(store.hit('ip', options, 100).allowed).toBe(true);
		const third = store.hit('ip', options, 200);
		expect(third.allowed).toBe(true);
		expect(third.remaining).toBe(0);

		const blocked = store.hit('ip', options, 300);
		expect(blocked.allowed).toBe(false);
		expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
	});

	it('lets requests through again once the window slides past old hits', () => {
		const store = new InMemorySlidingWindowStore();

		store.hit('ip', options, 0);
		store.hit('ip', options, 100);
		store.hit('ip', options, 200);
		expect(store.hit('ip', options, 300).allowed).toBe(false);

		// The first hit (t=0) has aged out by t=1001, freeing a slot.
		expect(store.hit('ip', options, 1001).allowed).toBe(true);
	});

	it('tracks separate keys independently', () => {
		const store = new InMemorySlidingWindowStore();

		store.hit('a', options, 0);
		store.hit('a', options, 1);
		store.hit('a', options, 2);
		expect(store.hit('a', options, 3).allowed).toBe(false);
		expect(store.hit('b', options, 3).allowed).toBe(true);
	});
});
