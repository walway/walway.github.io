import { injectLocalError } from './src/js/error.js';
import {
	getAnimationEntry,
	getReplayDelayMs,
	shouldLoop,
} from './src/js/animations.js';

((global) => {
	let profileReplayTimer = null;
	let wasmInstance = null;
	let currentLottieRunner = null;
	const TARGET_SETTINGS = 'settings';
	const TARGET_PROFILE = 'profile';
	const TARGET_PICTURE = 'picture';
	const SOURCE_IFRAME = 'iframe';

	function getQueryParams() {
		const currentUrl = window.location.href;
		const parsed = new URL(currentUrl);
		
		const searchParams = new URLSearchParams(parsed.search);
		if (searchParams.has('effect')) {
			return searchParams;
		}

		const questionMarkIndex = currentUrl.indexOf('?');
		if (questionMarkIndex === -1) {
			return new URLSearchParams();
		}

		const rawQuery = currentUrl.slice(questionMarkIndex + 1);
		const params = new URLSearchParams();

		if (/^[a-zA-Z0-9_-]+$/.test(rawQuery)) {
			params.set('effect', rawQuery);
			params.set('target', TARGET_PICTURE);
			params.set('source', SOURCE_IFRAME);
			return params;
		}

		const pairs = rawQuery.split('&');
		pairs.forEach(pair => {
			const [key, value] = pair.split('=');
			if (key && value) {
				params.set(key, decodeURIComponent(value));
			} else if (key && !value) {
				params.set('effect', key);
			}
		});

		if (!params.has('source')) params.set('source', SOURCE_IFRAME);
		if (!params.has('target')) params.set('target', TARGET_PICTURE);

		return params;
	}

	function clearProfileReplayTimer() {
		if (profileReplayTimer !== null) {
			clearTimeout(profileReplayTimer);
			profileReplayTimer = null;
		}
	}

	function scheduleProfileReplay(canvasElement, runner, delayMs) {
		clearProfileReplayTimer();
		canvasElement.style.display = 'none';
		if (runner) runner.pause();
		
		profileReplayTimer = setTimeout(() => {
			profileReplayTimer = null;
			canvasElement.style.display = 'block';
			if (runner) runner.restart();
		}, delayMs);
	}

	async function loadWasmEngine() {
		if (wasmInstance) return wasmInstance;
		const response = await fetch('./src/wasm/tlottie.wasm');
		if (!response.ok) throw new Error('WASM load failed');
		const buffer = await response.arrayBuffer();
		const { instance } = await WebAssembly.instantiate(buffer, {});
		wasmInstance = instance.exports;
		return wasmInstance;
	}

	global.roprimePlayLottie = function roprimePlayLottie(canvasElement, entry) {
		if (!(canvasElement instanceof HTMLCanvasElement)) {
			return Promise.reject(new Error('Target must be a canvas element'));
		}

		if (currentLottieRunner) {
			currentLottieRunner.destroy();
			currentLottieRunner = null;
		}

		const loop = shouldLoop(entry);
		const replayDelayMs = getReplayDelayMs(entry);
		const ctx = canvasElement.getContext('2d');

		ctx.imageSmoothingEnabled = false;

		let renderWidth = 0;
		let renderHeight = 0;

		const resizeCanvas = () => {
			const dpr = window.devicePixelRatio || 1;
			
			const measuredWidth = window.innerWidth || document.documentElement.clientWidth;
			const measuredHeight = window.innerHeight || document.documentElement.clientHeight;

			renderWidth = Math.round(measuredWidth * dpr);
			renderHeight = Math.round(measuredHeight * dpr);
			canvasElement.width = renderWidth;
			canvasElement.height = renderHeight;
		};
		window.addEventListener('resize', resizeCanvas);
		resizeCanvas();

		const jsonFileUrl = `./${entry.file.replace('.lottie', '.json')}`;

		return Promise.all([loadWasmEngine(), fetch(jsonFileUrl).then(res => {
			if (!res.ok) throw new Error(`JSON fetch failed (${res.status})`);
			return res.text();
		})])
		.then(([wasm, jsonText]) => {
			const encoder = new TextEncoder();
			const jsonBytes = encoder.encode(jsonText);
			const jsonLength = jsonBytes.length;

			const jsonPointer = wasm.tlottie_alloc(jsonLength);
			const wasmMemoryBuffer = new Uint8Array(wasm.memory.buffer);
			wasmMemoryBuffer.set(jsonBytes, jsonPointer);

			const player = wasm.tlottie_new(jsonPointer, jsonLength);
			const totalFrames = wasm.tlottie_frame_count(player);
			
			const fps = wasm.tlottie_frame_rate ? wasm.tlottie_frame_rate(player) : 60;
			const frameIntervalMs = 1000 / fps;

			let currentFrame = 0;
			let animationFrameId = null;
			let lastRenderTime = 0;
			let isPaused = false;

			function render(timestamp) {
				if (isPaused) return;
				animationFrameId = requestAnimationFrame(render);

				const elapsed = timestamp - lastRenderTime;
				if (elapsed < frameIntervalMs) return;

				lastRenderTime = timestamp - (elapsed % frameIntervalMs);

				if (currentFrame >= totalFrames) {
					if (loop) {
						currentFrame = 0;
					} else {
						scheduleProfileReplay(canvasElement, runnerHandle, replayDelayMs);
						return;
					}
				}

				if (renderWidth > 0 && renderHeight > 0) {
					const pixelPointer = wasm.tlottie_render(player, currentFrame, renderWidth, renderHeight);
					const pixelBuffer = new Uint8ClampedArray(wasm.memory.buffer, pixelPointer, renderWidth * renderHeight * 4);
					const imageData = new ImageData(pixelBuffer, renderWidth, renderHeight);
					ctx.putImageData(imageData, 0, 0);
				}

				currentFrame++;
			}

			animationFrameId = requestAnimationFrame(render);

			const runnerHandle = {
				setFrame: (frame) => { currentFrame = frame; },
				play: () => {
					if (isPaused) {
						isPaused = false;
						lastRenderTime = performance.now();
						animationFrameId = requestAnimationFrame(render);
					}
				},
				pause: () => {
					isPaused = true;
					if (animationFrameId) cancelAnimationFrame(animationFrameId);
				},
				restart: () => {
					isPaused = false;
					currentFrame = 0;
					lastRenderTime = performance.now();
					animationFrameId = requestAnimationFrame(render);
				},
				destroy: () => {
					isPaused = true;
					if (animationFrameId) cancelAnimationFrame(animationFrameId);
					window.removeEventListener('resize', resizeCanvas);
					if (wasm.tlottie_drop) wasm.tlottie_drop(player);
					if (wasm.tlottie_free) wasm.tlottie_free(jsonPointer, jsonLength);
				}
			};

			currentLottieRunner = runnerHandle;
			return runnerHandle;
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
			target === TARGET_SETTINGS || target === TARGET_PICTURE
				? true
				: target === TARGET_PROFILE
					? false
					: entry.loop,
		replayDelayMs: target === TARGET_PROFILE ? 5000 : entry.replayDelayMs,
	};

	const canvasElement = document.getElementById('lottieCanvas');
	global.roprimePlayLottie(canvasElement, playbackEntry).catch((err) => {
		console.error(err);
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
	});
})(typeof window !== 'undefined' ? window : globalThis);
