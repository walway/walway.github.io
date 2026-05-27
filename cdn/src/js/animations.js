// cdn/src/js/animations.js
//
// RoPrime plugin effect categories (iframe CDN):
//   profile — overlays on the Discord user profile card
//   picture — overlays on the avatar / picture area
//
// Parent iframe should allow transparency, e.g.:
//   <iframe src="...?effect=clockwork" allowtransparency="true" style="background: transparent;"></iframe>

/** @typedef {'profile' | 'picture'} EffectCategory */

/** @typedef {Object} AnimationEntry
 * @property {string} file — path to .lottie (under cdn/)
 * @property {EffectCategory} category
 * @property {boolean} [loop] — defaults by category (profile: false, picture: true)
 * @property {number} [replayDelayMs] — profile only: idle time before replay (default 5000)
 */

export const EffectCategory = {
	PROFILE: 'profile',
	PICTURE: 'picture',
};

export const PROFILE_REPLAY_DELAY_MS = 5000;

const EFFECT_KEY_REGEX = /^[a-z0-9_-]+$/i;

/** @type {Record<string, AnimationEntry>} */
export const animationOverrides = {
	clockwork: {
		category: EffectCategory.PROFILE,
	},
	dizzy: {
		category: EffectCategory.PICTURE,
	},
};

/**
 * @param {string | null | undefined} key
 * @returns {AnimationEntry | null}
 */
export function getAnimationEntry(key) {
	if (!key) return null;
	const normalized = key.trim().toLowerCase();
	if (!normalized || !EFFECT_KEY_REGEX.test(normalized)) return null;

	const override = animationOverrides[normalized] ?? {};
	return {
		file: `lottie/${normalized}/index.lottie`,
		category: override.category ?? EffectCategory.PICTURE,
		loop: override.loop,
		replayDelayMs: override.replayDelayMs,
	};
}

/**
 * @param {AnimationEntry} entry
 * @returns {boolean}
 */
export function isProfileEffect(entry) {
	return entry.category === EffectCategory.PROFILE;
}

/**
 * @param {AnimationEntry} entry
 * @returns {boolean}
 */
export function shouldLoop(entry) {
	if (typeof entry.loop === 'boolean') return entry.loop;
	return entry.category === EffectCategory.PICTURE;
}

/**
 * @param {AnimationEntry} entry
 * @returns {number}
 */
export function getReplayDelayMs(entry) {
	return entry.replayDelayMs ?? PROFILE_REPLAY_DELAY_MS;
}

/**
 * Remove Lottie background color / layers so the iframe can composite transparently.
 * @param {object} animationData
 * @returns {object}
 */
export function stripLottieBackground(animationData) {
	return animationData;
}
