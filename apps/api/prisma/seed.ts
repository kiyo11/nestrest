import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nestrest.local' },
    update: {},
    create: {
      email: 'admin@nestrest.local',
      name: 'Admin User',
      role: UserRole.ADMIN,
      passwordHash: 'hashed-password-here', // In production, hash the password properly
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create sample amenities
  const amenities = [
    { name: 'WiFi', icon: 'wifi', category: 'essentials' },
    { name: 'Kitchen', icon: 'kitchen', category: 'essentials' },
    { name: 'Air conditioning', icon: 'ac', category: 'essentials' },
    { name: 'Heating', icon: 'heating', category: 'essentials' },
    { name: 'Washer', icon: 'washer', category: 'essentials' },
    { name: 'Dryer', icon: 'dryer', category: 'essentials' },
    { name: 'Free parking', icon: 'parking', category: 'parking' },
    { name: 'Pool', icon: 'pool', category: 'entertainment' },
    { name: 'Hot tub', icon: 'hot-tub', category: 'entertainment' },
    { name: 'BBQ grill', icon: 'bbq', category: 'outdoor' },
    { name: 'Beach access', icon: 'beach', category: 'location' },
    { name: 'Waterfront', icon: 'waterfront', category: 'location' },
  ];

  const createdAmenities = [];
  for (const amenity of amenities) {
    const created = await prisma.amenity.upsert({
      where: { name: amenity.name },
      update: {},
      create: amenity,
    });
    createdAmenities.push(created);
  }

  console.log('✅ Created', createdAmenities.length, 'amenities');

  // Create sample property (your first vacation rental)
  const property = await prisma.property.create({
    data: {
      slug: 'oceanview-retreat',
      name: 'Oceanview Retreat',
      description: 'Beautiful oceanfront property with stunning views, perfect for a relaxing getaway. Features direct beach access, modern amenities, and spacious outdoor areas.',
      address: '123 Ocean Drive',
      city: 'Malibu',
      state: 'CA',
      zipCode: '90265',
      country: 'USA',
      latitude: 34.0259,
      longitude: -118.7798,
      maxGuests: 6,
      pricePerNight: 350,
      currency: 'USD',
      isActive: true,
      amenities: {
        create: createdAmenities.slice(0, 6).map((amenity) => ({
          amenityId: amenity.id,
        })),
      },
    },
  });

  console.log('✅ Created property:', property.name);

  // Add property images (using placeholder URLs - replace with real images later)
  const images = [
    { url: 'https://images.unsplash.com/photo-1499793983695-e24cc600e11c?w=800', altText: 'Ocean view from property', sortOrder: 1 },
    { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', altText: 'Living room', sortOrder: 2 },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', altText: 'Bedroom', sortOrder: 3 },
    { url: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800', altText: 'Kitchen', sortOrder: 4 },
    { url: 'https://images.unsplash.com/photo-1584622050111-993a426fbf0a?w=800', altText: 'Bathroom', sortOrder: 5 },
    { url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800', altText: 'Pool area', sortOrder: 6 },
  ];

  for (const image of images) {
    await prisma.propertyImage.create({
      data: {
        propertyId: property.id,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder,
      },
    });
  }

  console.log('✅ Added', images.length, 'property images');

  // Create a sample guest user for testing
  const guestUser = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      email: 'guest@example.com',
      name: 'Test Guest',
      role: UserRole.GUEST,
      passwordHash: 'hashed-password-here',
    },
  });

  console.log('✅ Created test guest user:', guestUser.email);

  // Create a sample booking (future date)
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30); // 30 days from now
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 5); // 5 nights

  await prisma.booking.create({
    data: {
      propertyId: property.id,
      guestUserId: guestUser.id,
      checkIn,
      checkOut,
      guests: 4,
      totalPrice: 1750,
      status: 'PENDING',
      notes: 'Sample booking for testing purposes',
    },
  });

  console.log('✅ Created sample booking');

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
