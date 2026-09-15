import { Router, type IRouter } from 'express';
import { createAddress, createVehicle, deleteAddress, deleteVehicle, listAddresses, listVehicles, updateAddress, updateVehicle } from '../controllers/accountController';
import { requireAuth } from '../middlewares/auth';
import { getProfile, updateProfile } from '../controllers/profileController';

const router: IRouter = Router();
router.use('/account', requireAuth);
router.get('/account/vehicles', listVehicles);
router.get('/account/profile', getProfile);
router.put('/account/profile', updateProfile);
router.post('/account/vehicles', createVehicle);
router.put('/account/vehicles/:id', updateVehicle);
router.delete('/account/vehicles/:id', deleteVehicle);
router.get('/account/addresses', listAddresses);
router.post('/account/addresses', createAddress);
router.put('/account/addresses/:id', updateAddress);
router.delete('/account/addresses/:id', deleteAddress);
export default router;
