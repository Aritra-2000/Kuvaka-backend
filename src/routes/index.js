import { Router } from 'express';
import offerRoutes from './offer.routes.js';
import leadRoutes from './lead.routes.js';
import scoreRoutes from './score.routes.js';
import resultRoutes from './result.routes.js';

const router = Router();

// API Routes
router.use('/offers', offerRoutes);
router.use('/leads', leadRoutes);
router.use('/scores', scoreRoutes);
router.use('/results', resultRoutes);

export default router;
