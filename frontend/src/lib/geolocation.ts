import type { AttendanceLocationInput } from '../types/api';

const REQUIRED_ACCURACY_METERS = 500;
const MAX_CAPTURE_DURATION_MS = 12_000;
const GEOLOCATION_PERMISSION_DENIED = 1;

export async function captureAttendanceLocation(): Promise<AttendanceLocationInput> {
  if (!('geolocation' in navigator)) {
    throw new Error('Location is required, but this browser does not support geolocation.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;

    function cleanup() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      window.clearTimeout(timeoutId);
    }

    function settleWithPosition(position: GeolocationPosition) {
      settled = true;
      cleanup();
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
    }

    function settleWithError(message: string) {
      settled = true;
      cleanup();
      reject(new Error(message));
    }

    const timeoutId = window.setTimeout(() => {
      if (settled) {
        return;
      }

      if (bestPosition && bestPosition.coords.accuracy <= REQUIRED_ACCURACY_METERS) {
        settleWithPosition(bestPosition);
        return;
      }

      settleWithError('Location accuracy is too low. Enable precise location and try again.');
    }, MAX_CAPTURE_DURATION_MS);

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (settled) {
            return;
          }

          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          if (position.coords.accuracy <= REQUIRED_ACCURACY_METERS) {
            settleWithPosition(position);
          }
        },
        (error) => {
          if (settled) {
            return;
          }

          if (error.code === GEOLOCATION_PERMISSION_DENIED) {
            settleWithError('Location permission is required to submit attendance.');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10_000,
        },
      );
    } catch {
      settleWithError('Location is required. Use HTTPS or localhost and try again.');
    }
  });
}
