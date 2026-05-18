// cdn/player.js
import { injectLocalError } from './src/js/error.js';
import {
	getAnimationEntry,
	getReplayDelayMs,
	stripLottieBackground,
	shouldLoop,
} from './src/js/animations.js';

(function (global) {
	let profileReplayTimer = null;

	function clearProfileReplayTimer() {
		if (profileReplayTimer !== null) {
			clearTimeout(profileReplayTimer);
			profileReplayTimer = null;
		}
	}

	function scheduleProfileReplay(container, anim, delayMs) {
		clearProfileReplayTimer();
		container.style.display = 'none';
		profileReplayTimer = setTimeout(() => {
			profileReplayTimer = null;
			container.style.display = '';
			anim.goToAndPlay(0, true);
		}, delayMs);
	}

	function attachProfilePlayback(container, anim, replayDelayMs) {
		anim.addEventListener('complete', () => {
			scheduleProfileReplay(container, anim, replayDelayMs);
		});
	}

	global.roprimePlayLottie = function roprimePlayLottie(container, entry) {
		if (!(container instanceof HTMLElement)) {
			return Promise.reject(new Error('Missing animation container'));
		}
		if (!global.lottie?.loadAnimation) {
			return Promise.reject(new Error('lottie-web is not loaded'));
		}

		const loop = shouldLoop(entry);
		const replayDelayMs = getReplayDelayMs(entry);

		return fetch(entry.file)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Animation failed to fetch (${response.status})`);
				}
				return response.json();
			})
			.then((rawData) => stripLottieBackground(rawData))
			.then((animationData) => {
				const anim = global.lottie.loadAnimation({
					container,
					renderer: 'svg',
					loop,
					autoplay: true,
					animationData,
					rendererSettings: {
						preserveAspectRatio: 'xMidYMid meet',
						progressiveLoad: true,
						clearCanvas: true,
					},
				});

				const svg = container.querySelector('svg');
				if (svg) {
					svg.style.background = 'transparent';
				}

				if (!loop) {
					attachProfilePlayback(container, anim, replayDelayMs);
				}

				return anim;
			});
	};

	const isFramed = window.self !== window.top;

	if (!isFramed) {
		injectLocalError(
			'403 Forbidden',
			'Access Configuration Refused: Invalid Request Origin Token.',
		);
		return;
	}

	const effectKey = new URLSearchParams(window.location.search).get('effect');
	const entry = getAnimationEntry(effectKey);

	if (!entry) {
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
		return;
	}

	const container = document.getElementById('container');
	global.roprimePlayLottie(container, entry).catch(() => {
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
	});
})(typeof window !== 'undefined' ? window : globalThis);
