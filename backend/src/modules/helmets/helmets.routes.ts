import { Router } from 'express';
import { helmetsController } from './helmets.controller';

export const helmetsRouter = Router();

helmetsRouter.get('/brands', (req, res) => helmetsController.getBrands(req, res));
helmetsRouter.get('/types', (req, res) => helmetsController.getTypes(req, res));
helmetsRouter.get('/', (req, res) => helmetsController.getProducts(req, res));
helmetsRouter.get('/:id', (req, res) => helmetsController.getProductById(req, res));
