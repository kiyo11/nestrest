import { prisma } from '../config/database';
import { CreatePropertyInput, UpdatePropertyInput, PropertyWithDetails } from '@nestrest/shared';

export class PropertyService {
  /**
   * Get all active properties
   */
  async getProperties() {
    return prisma.property.findMany({
      where: { isActive: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get property by slug with full details
   */
  async getPropertyBySlug(slug: string): Promise<PropertyWithDetails | null> {
    const property = await prisma.property.findFirst({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    return property as PropertyWithDetails | null;
  }

  /**
   * Get property by ID with full details
   */
  async getPropertyById(id: string): Promise<PropertyWithDetails | null> {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        amenities: { include: { amenity: true } },
      },
    });

    return property as PropertyWithDetails | null;
  }

  /**
   * Create a new property (admin only)
   */
  async createProperty(input: CreatePropertyInput) {
    // Check if slug already exists
    const existing = await prisma.property.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error('Slug already in use');
    }

    return prisma.$transaction(async (tx) => {
      // Create property
      const property = await tx.property.create({
        data: {
          ...input,
          currency: input.currency || 'USD',
        },
      });

      return property;
    });
  }

  /**
   * Update a property (admin only)
   */
  async updateProperty(id: string, input: UpdatePropertyInput) {
    const existing = await prisma.property.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Property not found');
    }

    return prisma.property.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete a property (admin only) - soft delete by setting isActive to false
   */
  async deactivateProperty(id: string) {
    const existing = await prisma.property.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Property not found');
    }

    return prisma.property.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get amenities catalog
   */
  async getAmenities() {
    return prisma.amenity.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Assign amenities to a property
   */
  async assignAmenities(propertyId: string, amenityIds: string[]) {
    // Delete existing assignments
    await prisma.propertyAmenity.deleteMany({
      where: { propertyId },
    });

    // Create new assignments
    const assignments = amenityIds.map((amenityId) =>
      prisma.propertyAmenity.create({
        data: { propertyId, amenityId },
      })
    );

    await Promise.all(assignments);

    return this.getPropertyById(propertyId);
  }

  /**
   * Add property image
   */
  async addPropertyImage(
    propertyId: string,
    url: string,
    altText?: string,
    sortOrder?: number
  ) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      throw new Error('Property not found');
    }

    return prisma.propertyImage.create({
      data: {
        propertyId,
        url,
        altText,
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  /**
   * Update image order
   */
  async updateImageOrder(propertyId: string, imageUpdates: { id: string; sortOrder: number }[]) {
    const updates = imageUpdates.map(({ id, sortOrder }) =>
      prisma.propertyImage.update({
        where: { id },
        data: { sortOrder },
      })
    );

    await Promise.all(updates);

    return this.getPropertyById(propertyId);
  }
}

export const propertyService = new PropertyService();
