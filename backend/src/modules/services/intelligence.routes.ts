import { Router } from 'express';
import { listSymptoms, getRecommendations } from './intelligence.controller';

export const intelligenceRouter = Router();

intelligenceRouter.get('/symptoms', (req, res) => listSymptoms(req, res));
intelligenceRouter.get('/recommendations', (req, res) => getRecommendations(req, res));
