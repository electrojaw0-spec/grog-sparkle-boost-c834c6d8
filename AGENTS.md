# Architecture

- Keep trial duration and expiry calculation in the browser-safe trial module used by the server check, so boundary tests cover the same rule as production; trial start remains the server-recorded device creation time.