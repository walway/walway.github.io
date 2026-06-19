export const EffectCategory = {
	PROFILE: 'profile',
	PICTURE: 'picture',
};

export const PROFILE_REPLAY_DELAY_MS = 5000;

const EFFECT_KEY_REGEX = /^[a-z0-9_-]+$/i;

export const animationOverrides = {
	clockwork: {
		category: EffectCategory.PROFILE,
	},
	dizzy: {
		category: EffectCategory.PICTURE,
	},
};

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

export function isProfileEffect(entry) {
	return entry.category === EffectCategory.PROFILE;
}

export function shouldLoop(entry) {
	if (typeof entry.loop === 'boolean') return entry.loop;
	return entry.category === EffectCategory.PICTURE;
}

export function getReplayDelayMs(entry) {
	if (typeof entry.replayDelayMs === 'number') {
		return entry.replayDelayMs;
	}
	return isProfileEffect(entry) ? PROFILE_REPLAY_DELAY_MS : 0;
}

export function stripLottieBackground(animationData) {
	return animationData;
}
