import { Router, type IRouter } from "express";
import {
  getSpareParts,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart,
  getCategories,
  getCompatibleParts,
} from "../controllers/sparePartsController";
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brandController";

const router: IRouter = Router();

// Spare parts routes
router.get("/parts", getSpareParts);
router.get('/parts/:id', getSparePartById);
router.get("/spare-parts", getSpareParts);
router.get("/spare-parts/:id", getSparePartById);
router.get('/parts/categories', getCategories);
router.get('/parts/compatible/:vehicleId', getCompatibleParts);
router.post("/spare-parts", requireAuth, requireRole('ADMIN', 'STAFF'), createSparePart);
router.post('/parts', requireAuth, requireRole('ADMIN', 'STAFF'), createSparePart);
router.put("/spare-parts/:id", requireAuth, requireRole('ADMIN', 'STAFF'), updateSparePart);
router.put('/parts/:id', requireAuth, requireRole('ADMIN', 'STAFF'), updateSparePart);
router.delete("/spare-parts/:id", requireAuth, requireRole('ADMIN', 'STAFF'), deleteSparePart);
router.delete('/parts/:id', requireAuth, requireRole('ADMIN', 'STAFF'), deleteSparePart);

// Brands routes
router.get("/brands", getBrands);
router.get("/brands/:id", getBrandById);
router.post("/brands", createBrand);
router.put("/brands/:id", updateBrand);
router.delete("/brands/:id", deleteBrand);

export default router;