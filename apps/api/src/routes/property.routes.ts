import { Router } from 'express';
import { propertyService } from '../services/property.service';

const router = Router();

/**
 * @route   GET /api/properties
 * @desc    Get all active properties with images and amenities
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const properties = await propertyService.getProperties();
    res.json(properties);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/properties/:slug
 * @desc    Get property details by slug
 * @access  Public
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyBySlug(req.params.slug);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/properties/:id
 * @desc    Get property details by ID (admin)
 * @access  Private/Admin
 */
router.get('/:id', async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/properties
 * @desc    Create a new property (admin only)
 * @access  Private/Admin
 */
router.post('/admin/properties', async (req, res, next) => {
  try {
    const { slug, name, description, address, city, state, zipCode, country, maxGuests, pricePerNight } = req.body;

    if (!slug || !name || !description || !address || !city || !state || !zipCode || !country || !maxGuests || !pricePerNight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const property = await propertyService.createProperty({
      slug,
      name,
      description,
      address,
      city,
      state,
      zipCode,
      country,
      maxGuests,
      pricePerNight: parseFloat(pricePerNight),
      currency: req.body.currency || 'USD',
    });

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/properties/:id
 * @desc    Update a property (admin only)
 * @access  Private/Admin
 */
router.put('/admin/properties/:id', async (req, res, next) => {
  try {
    const updates = req.body;

    // Validate that at least one field is provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const property = await propertyService.updateProperty(req.params.id, updates);

    res.json(property);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/properties/:id
 * @desc    Deactivate a property (admin only)
 * @access  Private/Admin
 */
router.delete('/admin/properties/:id', async (req, res, next) => {
  try {
    const property = await propertyService.deactivateProperty(req.params.id);

    res.json({ message: 'Property deactivated successfully', property });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/amenities
 * @desc    Get all available amenities
 * @access  Private/Admin
 */
router.get('/admin/amenities', async (req, res, next) => {
  try {
    const amenities = await propertyService.getAmenities();

    res.json(amenities);
  } catch (error) {
    next(error);
  }
});

export default router;
