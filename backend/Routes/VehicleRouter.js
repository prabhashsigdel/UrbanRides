import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import * as vehicleController from '../Controllers/VehicleController.js';
import { requireAdmin, requireAuth } from '../Middlewares/Auth.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Extension comes from the checked MIME type, never the uploaded name, so uploads can't be served as HTML.
const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${IMAGE_EXTENSIONS[file.mimetype]}`),
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => cb(null, file.mimetype in IMAGE_EXTENSIONS),
});

export default function vehicleRouter(auth) {
  const router = express.Router();
  const adminOnly = [requireAuth(auth), requireAdmin];

  router.get('/', vehicleController.getAllVehicles);
  router.post('/', adminOnly, upload.single('image'), vehicleController.createVehicle);
  router.put('/:id', adminOnly, upload.single('image'), vehicleController.updateVehicle);
  router.delete('/:id', adminOnly, vehicleController.deleteVehicle);

  return router;
}
