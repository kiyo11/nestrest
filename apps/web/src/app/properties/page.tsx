'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Property {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerNight: number;
  maxGuests: number;
  images: Array<{ url: string; altText?: string }>;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Failed to fetch properties');
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            NestRest
          </Link>
          <div className="space-x-4">
            <Link href="/properties" className="text-gray-700 hover:text-blue-600">
              Properties
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600">
              About
            </Link>
          </div>
        </nav>
      </header>

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Our Properties</h1>
          <p className="text-blue-100">Find your perfect vacation rental</p>
        </div>
      </section>

      {/* Property Grid */}
      <main className="container mx-auto px-4 py-8">
        {properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-lg">No properties available at the moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Link key={property.id} href={`/properties/${property.slug}`}>
                <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  {/* Property Image */}
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {property.images[0]?.url ? (
                      <img
                        src={property.images[0].url}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                    {/* Price Badge */}
                    <div className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                      <span className="text-blue-600 font-semibold">
                        ${property.pricePerNight}
                      </span>
                      <span className="text-gray-600 text-sm">/night</span>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                      {property.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{property.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
                      <span>{property.city}, {property.state}</span>
                      <span>•</span>
                      <span>Up to {property.maxGuests} guests</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 NestRest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
