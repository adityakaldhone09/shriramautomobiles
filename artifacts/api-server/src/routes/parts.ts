import { Router, type IRouter } from "express";
import {
  getSpareParts,
  getSparePartById,
  createSparePart,
  updateSparePart,
  deleteSparePart,
} from "../controllers/sparePartsController";
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brandController";

const router: IRouter = Router();

// Spare parts routes
router.get("/spare-parts", getSpareParts);
router.get("/spare-parts/:id", getSparePartById);
router.post("/spare-parts", createSparePart);
router.put("/spare-parts/:id", updateSparePart);
router.delete("/spare-parts/:id", deleteSparePart);

// Brands routes
router.get("/brands", getBrands);
router.get("/brands/:id", getBrandById);
router.post("/brands", createBrand);
router.put("/brands/:id", updateBrand);
router.delete("/brands/:id", deleteBrand);

export default router;