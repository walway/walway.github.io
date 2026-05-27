export function injectLocalError(title, msg) {
	window.stop();
	
	const cryptoArray = new Uint32Array(2);
	window.crypto.getRandomValues(cryptoArray);
	const rayId = Array.from(cryptoArray, num => num.toString(16).padStart(8, '0')).join('').substring(0, 16);

	document.documentElement.innerHTML = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>403 Forbidden</title>
			<style>
				html, body {
					margin: 0;
					padding: 0;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
					background-color: #fff;
					color: #2f2f2f;
					line-height: 1.5;
				}
				
				@media (prefers-color-scheme: dark) {
					html, body {
						background-color: #111111;
						color: #d9d9d9;
					}
					.cf-error-details { border-top-color: #2a2a2a !important; }
					code { background-color: #222 !important; color: #ff79c6 !important; }
				}

				.cf-wrapper {
					max-width: 800px;
					margin: 60px auto;
					padding: 0 20px;
				}

				h1 {
					font-size: 32px;
					font-weight: 400;
					margin: 0 0 8px 0;
					color: #111;
				}
				@media (prefers-color-scheme: dark) {
					h1 { color: #fff; }
				}

				.cf-error-type {
					font-size: 14px;
					text-transform: uppercase;
					letter-spacing: 1px;
					color: #767676;
					margin-bottom: 30px;
				}

				p {
					font-size: 16px;
					margin: 0 0 30px 0;
				}

				.cf-error-details {
					border-top: 1px solid #e0e0e0;
					padding-top: 20px;
					font-size: 13px;
					color: #666;
					display: flex;
					flex-wrap: wrap;
					gap: 20px;
				}

				code {
					font-family: monospace;
					background-color: #f4f4f4;
					padding: 2px 6px;
					border-radius: 4px;
					font-size: 13px;
					color: #d0021b;
				}
			</style>
		</head>
		<body>
			<div class="cf-wrapper">
				<h1>403 Access Forbidden</h1>
				<div class="cf-error-type">Error Code: Web_Access_Block</div>
				
				<p>${msg}</p>

				<div class="cf-error-details">
					<div><strong>Ray ID:</strong> <code>${rayId}</code></div>
					<div><strong>Status:</strong> <code>Forbidden</code></div>
					<div><strong>Server IP:</strong> <code>127.0.0.1</code></div>
				</div>
			</div>
		</body>
		</html>
	`;
	
	console.clear();
	throw new Error("Server execution halted: 403 Access Forbidden");
}