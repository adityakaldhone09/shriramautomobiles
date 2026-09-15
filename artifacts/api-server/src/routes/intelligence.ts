import { Router, type IRouter } from 'express';
import {
  listSymptoms,
  getRecommendations,
  diagnoseSymptoms,
} from '../controllers/serviceIntelligenceController';

const router: IRouter = Router();

router.get('/service-symptoms', listSymptoms);
router.get('/service-recommendations', getRecommendations);
router.post('/ai/diagnose-symptoms', diagnoseSymptoms);

export default router;
