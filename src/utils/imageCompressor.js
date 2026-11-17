// Client-side image resizer/compressor so uploaded pet portraits stay small (~10-15 KB)
// and sync cleanly across WebSocket/MQTT multiplayer connections.

export function compressDataUrl(dataUrl, maxDim = 220, quality = 0.72) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || maxDim;
        let h = img.naturalHeight || img.height || maxDim;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.max(1, Math.round((h * maxDim) / w));
            w = maxDim;
          } else {
            w = Math.max(1, Math.round((w * maxDim) / h));
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out && out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function compressImageFile(file, maxDim = 220, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const compressed = await compressDataUrl(reader.result, maxDim, quality);
        resolve(compressed);
      } else {
        resolve('');
      }
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export async function prepareMemorialForSync(memorial) {
  if (!memorial || typeof memorial !== 'object') return memorial;

  let compactPhoto = memorial.photo;
  if (
    typeof compactPhoto === 'string' &&
    compactPhoto.startsWith('data:image/') &&
    compactPhoto.length > 28000
  ) {
    compactPhoto = await compressDataUrl(compactPhoto, 220, 0.7);
  }

  const compactMemories = [];
  const srcMemories = Array.isArray(memorial.memories) ? memorial.memories.slice(0, 6) : [];
  for (const mem of srcMemories) {
    let mp = mem.photo;
    if (mem.photo === memorial.photo) {
      mp = compactPhoto;
    } else if (typeof mp === 'string' && mp.startsWith('data:image/') && mp.length > 28000) {
      mp = await compressDataUrl(mp, 220, 0.68);
    }
    compactMemories.push({ ...mem, photo: mp });
  }

  return {
    ...memorial,
    photo: compactPhoto,
    memories: compactMemories,
    tributes: Array.isArray(memorial.tributes) ? memorial.tributes.slice(0, 8) : [],
    offeringsLog: Array.isArray(memorial.offeringsLog) ? memorial.offeringsLog.slice(0, 8) : [],
  };
}
