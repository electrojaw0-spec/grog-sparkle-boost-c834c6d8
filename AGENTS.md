# Architecture

- Keep trial duration and expiry calculation in the browser-safe trial module used by the server check, so boundary tests cover the same rule as production; trial start is the later of the server-recorded device creation time and the trial launch moment, so pre-launch users get a full trial.
- Tutor payment decisions must wait for entitlement checks to finish and never override an active trial or subscription; this avoids transient loading states opening a sticky payment overlay.