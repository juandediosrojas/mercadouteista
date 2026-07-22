import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseApp, getApp } from 'firebase/app';

type ProgressCallback = (progressPercent: number) => void;

const storage = getStorage();

async function uploadImage(file: File, folder = 'images', onProgress?: ProgressCallback): Promise<{ url: string; path: string }>{
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const fullPath = `${folder}/${filename}`;
  const storageRef = ref(storage, fullPath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      if (onProgress) onProgress(Math.round(progress));
    }, error => reject(error), async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path: fullPath });
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function deleteImage(path: string): Promise<void> {
  if (!path) return;
  const storageRef = ref(storage, path);
  await deleteObject(storageRef).catch(err => {
    // ignore not-found errors, rethrow others
    if (err && err.code !== 'storage/object-not-found') throw err;
  });
}

async function updateImage(file: File, existingPath: string | null, folder = 'images', onProgress?: ProgressCallback): Promise<{ url: string; path: string }>{
  // delete existing if provided
  if (existingPath) {
    try { await deleteImage(existingPath); } catch (e) {
      // proceed even if delete fails
      console.warn('Failed deleting existing image', e);
    }
  }
  return uploadImage(file, folder, onProgress);
}

export { uploadImage, updateImage, deleteImage };
