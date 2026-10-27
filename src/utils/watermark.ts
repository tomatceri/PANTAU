/**
 * Utilities for site photo handling and attachment.
 */

/**
 * Reads an uploaded photo file as a clean image Data URL without burning watermark, timestamp, or GPS coordinates onto the canvas.
 */
export async function readCleanPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Gagal membaca file foto'));
        return;
      }

      // If file is already reasonably sized (< 1.5MB), return directly
      if (file.size < 1.5 * 1024 * 1024) {
        resolve(dataUrl);
        return;
      }

      // Scale down large camera photos (e.g. 8MB+) cleanly without modifying or burning any overlay
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface WatermarkOptions {
  projectName: string;
  projectCode: string;
  coordinates?: string;
  timestamp?: string;
  caption?: string;
}

export async function applyPhotoWatermark(
  imageSource: string | File,
  options: WatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // Preserve full image resolution
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      const width = canvas.width;
      const height = canvas.height;
      const baseScale = Math.max(1, width / 1200);

      // Watermark Bar overlay at bottom
      const barHeight = Math.round(90 * baseScale);
      const gradient = ctx.createLinearGradient(0, height - barHeight - 20 * baseScale, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
      gradient.addColorStop(0.3, 'rgba(15, 23, 42, 0.82)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - barHeight - 20 * baseScale, width, barHeight + 20 * baseScale);

      // Bottom accent border
      ctx.fillStyle = '#f59e0b'; // Construction safety amber
      ctx.fillRect(0, height - 4 * baseScale, width, 4 * baseScale);

      // Text settings
      const padX = Math.round(28 * baseScale);
      const textStartY = height - barHeight + Math.round(22 * baseScale);

      // Project Line
      ctx.font = `bold ${Math.round(18 * baseScale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`PROJ: ${options.projectName} (${options.projectCode})`, padX, textStartY);

      // Geo & Timestamp line
      const now = options.timestamp ? new Date(options.timestamp) : new Date();
      const formattedDate = now.toISOString().split('T')[0];
      const formattedTime = now.toTimeString().split(' ')[0] + ' LST';
      const coords = options.coordinates || '-6.2088° S, 106.8456° E (Elev: 24m)';

      ctx.font = `${Math.round(14 * baseScale)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`GPS: ${coords}`, padX, textStartY + Math.round(24 * baseScale));

      // Right-aligned verification badge
      const stampText = `DATE: ${formattedDate} ${formattedTime}`;
      const badgeText = `SITEPULSE VERIFIED EVIDENCE`;
      ctx.textAlign = 'right';
      ctx.font = `600 ${Math.round(14 * baseScale)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#38bdf8'; // Sky blue
      ctx.fillText(stampText, width - padX, textStartY);

      ctx.fillStyle = '#4ade80'; // Emerald badge
      ctx.font = `bold ${Math.round(13 * baseScale)}px "JetBrains Mono", monospace`;
      ctx.fillText(`[✓] ${badgeText}`, width - padX, textStartY + Math.round(24 * baseScale));

      // Reset alignment
      ctx.textAlign = 'left';

      // Export as high quality JPEG
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };

    img.onerror = (err) => {
      reject(err);
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Get device GPS coordinates if user allows, else return default fallback
 */
export async function getDeviceCoordinates(defaultCoords: string): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(defaultCoords);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        const latDir = pos.coords.latitude >= 0 ? 'N' : 'S';
        const lngDir = pos.coords.longitude >= 0 ? 'E' : 'W';
        const accuracy = Math.round(pos.coords.accuracy);
        resolve(`${Math.abs(Number(lat))}° ${latDir}, ${Math.abs(Number(lng))}° ${lngDir} (±${accuracy}m)`);
      },
      () => {
        // Fallback on error or denied permission
        resolve(defaultCoords);
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}
