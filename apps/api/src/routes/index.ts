import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { partsRouter } from '../modules/parts/parts.routes';
import { servicesRouter } from '../modules/services/services.routes';
import { intelligenceRouter } from '../modules/services/intelligence.routes';
import { bookingsRouter } from '../modules/bookings/bookings.routes';
import { estimatesRouter } from '../modules/estimates/estimates.routes';
import { cartRouter } from '../modules/cart/cart.routes';
import { ordersRouter } from '../modules/orders/orders.routes';
import { mechanicsRouter } from '../modules/mechanics/mechanics.routes';
import { helmetsRouter } from '../modules/helmets/helmets.routes';
import { wholesaleRouter } from '../modules/wholesale/wholesale.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { createResponse } from '../utils/helpers';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  return res.json(createResponse(true, 'Shriram Automobiles API is healthy', { timestamp: new Date() }));
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/vehicles', vehiclesRouter);
apiRouter.use('/parts', partsRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/intelligence', intelligenceRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/estimates', estimatesRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/mechanics', mechanicsRouter);
apiRouter.use('/helmets', helmetsRouter);
apiRouter.use('/wholesale', wholesaleRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/admin', adminRouter);
