import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, isDevMode } from '@angular/core';
import { AppVersion } from '../app-version';

const BEAM_ANALYTICS_SCRIPT_ID = 'beam-analytics-script';
const BEAM_ANALYTICS_SRC = 'https://beamanalytics.b-cdn.net/beam.min.js';
const UNRELEASED_VERSION = '000000-0000000000';
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_IDLE_THRESHOLD_MS = 3 * 60 * 1000;
const BEAM_ANALYTICS_TOKEN = '06d5ef53-9171-431a-933a-3834ca6cf18d';

export function beamAnalyticsInitializer() {
  const documentRef = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);
  const currentVersion = String(AppVersion.VERSION);

  if (isDevMode() || currentVersion === UNRELEASED_VERSION)
    return;


  if (!documentRef.getElementById(BEAM_ANALYTICS_SCRIPT_ID)) {
    const scriptEl = documentRef.createElement('script');
    scriptEl.id = BEAM_ANALYTICS_SCRIPT_ID;
    scriptEl.src = BEAM_ANALYTICS_SRC;
    scriptEl.defer = true;
    scriptEl.setAttribute('data-token', BEAM_ANALYTICS_TOKEN);
    documentRef.head?.appendChild(scriptEl);
  }

  setupHeartbeat(documentRef, destroyRef);
}

type BeamWindow = Window & {
  beam?: (...args: unknown[]) => void;
};

function setupHeartbeat(documentRef: Document, destroyRef: DestroyRef) {
  const win = documentRef.defaultView as BeamWindow | null;

  if (!win) {
    return;
  }

  let lastSentAt = Date.now();

  const sendHeartbeat = () => {
    if (documentRef.hidden) {
      return;
    }

    if (typeof win.beam !== 'function') {
      return;
    }

    const now = Date.now();

    if (now - lastSentAt < HEARTBEAT_IDLE_THRESHOLD_MS) {
      return;
    }

    try {
      win.beam(`track/${AppVersion.VERSION}`);
      lastSentAt = now;
    } catch (error) {
      console.error('Beam heartbeat failed', error);
    }
  };

  const intervalId = win.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  destroyRef.onDestroy(() => {
    win.clearInterval(intervalId);
  });
}
