import { MenuItem } from './types';

export const MENU: MenuItem[] = [
  // Coffee
  { id: 'c1', name: 'Espresso', price: 120, category: 'Coffee' },
  { id: 'c2', name: 'Cappuccino', price: 150, category: 'Coffee' },
  { id: 'c3', name: 'Latte', price: 160, category: 'Coffee' },
  { id: 'c4', name: 'Mocha', price: 180, category: 'Coffee' },
  { id: 'c5', name: 'Cold Brew', price: 190, category: 'Coffee' },
  // Tea
  { id: 't1', name: 'Masala Tea', price: 100, category: 'Tea' },
  { id: 't2', name: 'Green Tea', price: 110, category: 'Tea' },
  { id: 't3', name: 'Iced Lemon Tea', price: 140, category: 'Tea' },
  // Pizza
  { id: 'p1', name: 'Margherita', price: 249, category: 'Pizza' },
  { id: 'p2', name: 'Farmhouse', price: 299, category: 'Pizza' },
  { id: 'p3', name: 'Paneer Tikka', price: 329, category: 'Pizza' },
  { id: 'p4', name: 'Pepperoni', price: 349, category: 'Pizza' },
  // Snacks
  { id: 's1', name: 'Garlic Bread', price: 120, category: 'Snack' },
  { id: 's2', name: 'French Fries', price: 130, category: 'Snack' },
  { id: 's3', name: 'Veg Sandwich', price: 150, category: 'Snack' },
  { id: 's4', name: 'Brownie', price: 140, category: 'Snack' },
];

export const TIMINGS = {
  weekday: '9 AM – 10 PM',
  weekend: '10 AM – 11 PM',
  happyHours: '4 PM – 6 PM (10% off beverages)',
};

export const GST_RATE = 0.05;
export const LOYALTY_RATE = 10; // 10 points per 100 rupees
export const LOYALTY_REDEMPTION_THRESHOLD = 100; // 100 points
export const LOYALTY_REDEMPTION_VALUE = 50; // 50 rupees discount
