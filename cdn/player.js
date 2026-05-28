import { injectLocalError } from './src/js/error.js';
import {
	getAnimationEntry,
	getReplayDelayMs,
	shouldLoop,
} from './src/js/animations.js';
import { DotLottie } from 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm';

((global) => {
	let profileReplayTimer = null;
	const TARGET_SETTINGS = 'settings';
	const TARGET_PROFILE = 'profile';
	const SOURCE_IFRAME = 'iframe';

	function getQueryParams() {
		const currentUrl = window.location.href;
		const parsed = new URL(currentUrl);
		if (parsed.search) {
			return parsed.searchParams;
		}

		const malformedMarkerIndex = currentUrl.indexOf('&');
		if (malformedMarkerIndex === -1) {
			return new URLSearchParams();
		}

		const rawQuery = currentUrl.slice(malformedMarkerIndex + 1);
		return new URLSearchParams(rawQuery);
	}

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
			anim.setFrame(0);
			anim.play();
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

		const loop = shouldLoop(entry);
		const replayDelayMs = getReplayDelayMs(entry);
		container.innerHTML = '';

		const canvas = document.createElement('canvas');
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.display = 'block';
		container.appendChild(canvas);

		return fetch(entry.file, { method: 'HEAD' }).then((response) => {
			if (!response.ok) {
				throw new Error(`Animation failed to fetch (${response.status})`);
			}

			const anim = new DotLottie({
				canvas,
				src: entry.file,
				autoplay: true,
				loop,
				renderConfig: {
					autoResize: true,
				},
			});

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

	const queryParams = getQueryParams();
	const effectKey = queryParams.get('effect');
	const target = queryParams.get('target');
	const source = queryParams.get('source');
	const entry = getAnimationEntry(effectKey);

	if (!entry) {
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
		return;
	}

	if (source !== SOURCE_IFRAME) {
		injectLocalError('403 Forbidden', 'Access Configuration Refused: Missing iframe source token.');
		return;
	}

	const playbackEntry = {
		...entry,
		loop:
			target === TARGET_SETTINGS
				? true
				: target === TARGET_PROFILE
					? false
					: entry.loop,
		replayDelayMs: target === TARGET_PROFILE ? 5000 : entry.replayDelayMs,
	};

	const container = document.getElementById('container');
	global.roprimePlayLottie(container, playbackEntry).catch(() => {
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
	});
})(typeof window !== 'undefined' ? window : globalThis);
