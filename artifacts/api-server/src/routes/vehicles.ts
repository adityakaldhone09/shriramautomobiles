import { Router, type IRouter } from 'express';
import { listVehicleBrands, listVehicleModels } from '../controllers/vehicleController';

const router: IRouter = Router();
router.get('/vehicle-brands', listVehicleBrands);
router.get('/vehicle-models', listVehicleModels);
export default router;
