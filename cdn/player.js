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

	// --- ANTI-TAMPER SECURITY LAYER ---
	// Enforce framing rules inside the runtime loop
	const isFramed = window.self !== window.top;
	
	// Optional: Enforce that parent domain matches your exact product ecosystem
	// Add this if you want to restrict which websites are allowed to iframe you
	// const trustedParent = window.parent.location.ancestorOrigins?.contains("https://yourpluginwebsite.com");

	if (!isFramed) {
		// Kill execution if someone opens player.js or cdn/index.html in a standalone tab
		injectLocalError("403 Forbidden", "Access Configuration Refused: Invalid Request Origin Token.");
		return;
	}

	const urlParams = new URLSearchParams(window.location.search);
	const effectKey = urlParams.get('effect'); 
	
	if (!effectKey) {
		injectLocalError("404 Not Found", "The requested URL was not found on this server.");
	} else {
		const cleanKey = effectKey.toLowerCase();
		const targetJsonPath = `lottie/${cleanKey}/index.json`;

		global.roprimePlayClockworkLottie(document.getElementById("container"), {
			jsonUrl: targetJsonPath
		}).catch((err) => {
			injectLocalError("404 Not Found", "The requested URL was not found on this server.");
		});
	}

})(typeof window !== "undefined" ? window : globalThis);