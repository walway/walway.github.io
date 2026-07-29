import { injectLocalError } from './src/js/error.js';
import {
	getAnimationEntry,
	getReplayDelayMs,
	shouldLoop,
} from './src/js/animations.js';
import * as fflate from 'https://jsdelivr.net';

((global) => {
	let profileReplayTimer = null;
	let wasmInstance = null;
	const TARGET_SETTINGS = 'settings';
	const TARGET_PROFILE = 'profile';
	const TARGET_PICTURE = 'picture';
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

	function scheduleProfileReplay(container, renderState, delayMs) {
		clearProfileReplayTimer();
		container.style.display = 'none';
		renderState.active = false;
		
		profileReplayTimer = setTimeout(() => {
			profileReplayTimer = null;
			container.style.display = '';
			renderState.currentFrame = 0;
			renderState.active = true;
			renderWasmFrame(renderState);
		}, delayMs);
	}

	async function loadWasmEngine() {
		if (wasmInstance) return wasmInstance;
		const response = await fetch('./wasm/tlottie.wasm');
		if (!response.ok) throw new Error('Failed to fetch tlottie.wasm');
		const buffer = await response.arrayBuffer();
		const { instance } = await WebAssembly.instantiate(buffer, {});
		wasmInstance = instance.exports;
		return wasmInstance;
	}

	async function extractLottieJson(url) {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Animation fetch failed (${response.status})`);
		const arrayBuffer = await response.arrayBuffer();
		const zipData = new Uint8Array(arrayBuffer);
		const unzipped = fflate.unzipSync(zipData);
		
		let animationFilename = 'animations/data.json'; 
		if (unzipped['manifest.json']) {
			const manifestText = new TextDecoder().decode(unzipped['manifest.json']);
			const manifest = JSON.parse(manifestText);
			if (manifest.animations && manifest.animations[0]) {
				animationFilename = `animations/${manifest.animations[0].id}.json`;
			}
		}

		const animBuffer = unzipped[animationFilename] || unzipped[Object.keys(unzipped).find(k => k.endsWith('.json'))];
		if (!animBuffer) throw new Error('No animation JSON asset found inside .lottie file');
		
		return new TextDecoder().decode(animBuffer);
	}

	function renderWasmFrame(state) {
		if (!state.active) return;

		const { wasm, player, totalFrames, loop, replayDelayMs, container, canvas, ctx } = state;
		
		if (state.currentFrame >= totalFrames) {
			if (loop) {
				state.currentFrame = 0;
			} else {
				scheduleProfileReplay(container, state, replayDelayMs);
				return;
			}
		}

		const w = canvas.width;
		const h = canvas.height;

		if (w > 0 && h > 0) {
			const pixelPointer = wasm.render_frame(player, state.currentFrame, w, h);
			const pixelBuffer = new Uint8ClampedArray(wasm.memory.buffer, pixelPointer, w * h * 4);
			const imageData = new ImageData(pixelBuffer, w, h);
			ctx.putImageData(imageData, 0, 0);
		}

		state.currentFrame++;
		state.animationFrameId = requestAnimationFrame(() => renderWasmFrame(state));
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
		const ctx = canvas.getContext('2d');

		const resizeCanvas = () => {
			canvas.width = container.clientWidth * window.devicePixelRatio;
			canvas.height = container.clientHeight * window.devicePixelRatio;
		};
		window.addEventListener('resize', resizeCanvas);
		resizeCanvas();

		return Promise.all([loadWasmEngine(), extractLottieJson(entry.file)])
			.then(([wasm, jsonText]) => {
				const player = wasm.create_player(jsonText);
				const totalFrames = wasm.get_total_frames(player);

				const renderState = {
					wasm,
					player,
					totalFrames,
					loop,
					replayDelayMs,
					container,
					canvas,
					ctx,
					currentFrame: 0,
					active: true,
					animationFrameId: null
				};

				renderWasmFrame(renderState);

				return {
					setFrame: (frame) => { renderState.currentFrame = frame; },
					play: () => { 
						if (!renderState.active) {
							renderState.active = true; 
							renderWasmFrame(renderState);
						}
					},
					destroy: () => {
						renderState.active = false;
						cancelAnimationFrame(renderState.animationFrameId);
						window.removeEventListener('resize', resizeCanvas);
					}
				};
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

	const container = document.getElementById('container');
	global.roprimePlayLottie(container, playbackEntry).catch((err) => {
		console.error(err);
		injectLocalError('404 Not Found', 'The requested URL was not found on this server.');
	});
})(typeof window !== 'undefined' ? window : globalThis);