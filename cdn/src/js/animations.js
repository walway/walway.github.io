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
 * @property {string} file — path to lottie JSON (under cdn/)
 * @property {EffectCategory} category
 * @property {boolean} [loop] — defaults by category (profile: false, picture: true)
 * @property {number} [replayDelayMs] — profile only: idle time before replay (default 5000)
 */

export const EffectCategory = {
	PROFILE: 'profile',
	PICTURE: 'picture',
};

export const PROFILE_REPLAY_DELAY_MS = 5000;

/** @type {Record<string, AnimationEntry>} */
export const animationRegistry = {
	clockwork: {
		file: 'lottie/clockwork/index.json',
		category: EffectCategory.PROFILE,
	},
	dizzy: {
		file: 'lottie/dizzy/dizzy.json',
		category: EffectCategory.PICTURE,
	},
};

/**
 * @param {string | null | undefined} key
 * @returns {AnimationEntry | null}
 */
export function getAnimationEntry(key) {
	if (!key) return null;
	return animationRegistry[key.toLowerCase()] ?? null;
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
	const data = structuredClone(animationData);
	delete data.bg;

	if (Array.isArray(data.layers)) {
		data.layers = data.layers.filter((layer) => {
			if (layer.ty !== 1) return true;
			const name = (layer.nm || '').toLowerCase();
			return !name.includes('background') && name !== 'bg';
		});
	}

	return data;
}
