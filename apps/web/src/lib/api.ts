// API Client for NestRest

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders as HeadersInit,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'An error occurred' };
    }

    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Properties API
 */
export const propertiesApi = {
  getAll: async () => {
    return fetchApi<Array<{ id: string; slug: string; name: string; pricePerNight: number; images: Array<{ url: string }> }>>('/properties');
  },

  getBySlug: async (slug: string) => {
    return fetchApi<any>(`/properties/${slug}`);
  },
};

/**
 * Bookings API
 */
export const bookingsApi = {
  create: async (bookingData: any) => {
    return fetchApi<{ bookingId: string; clientSecret: string; amount: number }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  getMyBookings: async () => {
    return fetchApi<any[]>('/bookings/my-bookings');
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/bookings/${id}`);
  },

  cancel: async (id: string) => {
    return fetchApi<any>(`/bookings/${id}/cancel`, { method: 'PUT' });
  },
};

/**
 * Payments API
 */
export const paymentsApi = {
  createIntent: async (bookingId: string, amount: number) => {
    return fetchApi<{ clientSecret: string; bookingId: string; amount: number }>('/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ bookingId, amount }),
    });
  },

  getPaymentStatus: async (bookingId: string) => {
    return fetchApi<any>(`/payments/${bookingId}`);
  },
};

/**
 * Messages API
 */
export const messagesApi = {
  send: async (data: any) => {
    return fetchApi<any>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getInbox: async () => {
    return fetchApi<any[]>('/messages/inbox');
  },
};

export default {
  properties: propertiesApi,
  bookings: bookingsApi,
  payments: paymentsApi,
  messages: messagesApi,
};
