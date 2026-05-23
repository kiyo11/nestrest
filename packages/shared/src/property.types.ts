// Property types for NestRest

export interface Property {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  country: string;
  latitude: number;
  longitude: number;
  maxGuests: number;
  pricePerNight: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  altText?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: 'essentials' | 'parking' | 'entertainment' | 'outdoor' | 'location';
  createdAt: Date;
}

export interface PropertyWithDetails extends Property {
  images: PropertyImage[];
  amenities: Amenity[];
}
