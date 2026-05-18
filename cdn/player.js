// cdn/player.js
import { injectLocalError } from './src/js/error.js';

(function (global) {
	global.roprimePlayClockworkLottie = function roprimePlayClockworkLottie(container, options) {
		if (!(container instanceof HTMLElement)) {
			return Promise.reject(new Error("Missing animation container"));
		}
		if (!global.lottie?.loadAnimation) {
			return Promise.reject(new Error("lottie-web is not loaded"));
		}

		// Points directly to your static folder index layout configuration
		const jsonUrl = options?.jsonUrl ?? "lottie/clockwork/index.json";

		return fetch(jsonUrl)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Animation failed to fetch (${response.status})`);
				}
				return response.json();
			})
			.then((animationData) => {
				return global.lottie.loadAnimation({
					container,
					renderer: "svg",
					loop: true,
					autoplay: true,
					animationData,
					rendererSettings: {
						preserveAspectRatio: "xMidYMid meet",
						progressiveLoad: true,
					},
				});
			});
	};

	// --- AUTOMATION LAYER ---
	const urlParams = new URLSearchParams(window.location.search);
	const effectKey = urlParams.get('effect'); 
	
	// If someone strips the query string or leaves it empty, block them instantly
	if (!effectKey) {
		injectLocalError("404 Not Found", "The requested URL was not found on this server.");
	} else {
		const cleanKey = effectKey.toLowerCase();

		// Construct the path dynamically to match your precise /cdn/lottie/name/index.json vault structure
		const targetJsonPath = `lottie/${cleanKey}/index.json`;

		// Verify the file exists by calling your engine loop
		global.roprimePlayClockworkLottie(document.getElementById("container"), {
			jsonUrl: targetJsonPath
		}).catch((err) => {
			// If a user types a fake effect name that doesn't exist, throw your clean 404 page
			injectLocalError("404 Not Found", "The requested URL was not found on this server.");
		});
	}

})(typeof window !== "undefined" ? window : globalThis);