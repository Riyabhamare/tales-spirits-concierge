export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'Coffee' | 'Tea' | 'Pizza' | 'Snack';
  description?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Reservation {
  name: string;
  time: string;
  guests: number;
}

export interface LoyaltyInfo {
  points: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Bill {
  subtotal: number;
  gst: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
  pointsEarned: number;
}
