import fs from 'fs/promises';
import path from 'path';

export const UPLOAD_DIR = 'uploads';

/** Removes an uploaded image by its stored file name. Missing files and empty names are ignored. */
export async function deleteUpload(fileName) {
  if (!fileName) return;
  // basename keeps a bad stored value from reaching outside the uploads folder.
  const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Couldn't delete upload ${filePath}:`, error.message);
  }
}
