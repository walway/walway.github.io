import { injectLocalError } from './src/js/error.js';
import {
	getAnimationEntry,
	getReplayDelayMs,
	shouldLoop,
} from './src/js/animations.js';
import { DotLottie } from 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm';

((global) => {
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
