
import { MenuItem, Order } from '../types';

// Mock In-Memory Database
const ACTIVE_MENU: MenuItem[] = [
  { id: '1', name: 'Primus', category: 'Drinks', price: 1000, currency: 'RWF', isAvailable: true },
  { id: '2', name: 'Mutzig', category: 'Drinks', price: 1200, currency: 'RWF', isAvailable: true },
  { id: '3', name: 'Skol Lager', category: 'Drinks', price: 1000, currency: 'RWF', isAvailable: true },
  { id: '4', name: 'Soda (Coke/Fanta)', category: 'Drinks', price: 800, currency: 'RWF', isAvailable: true },
  { id: '5', name: 'Water', category: 'Drinks', price: 500, currency: 'RWF', isAvailable: true },
  { id: '6', name: 'Brochettes (Goat)', category: 'Food', price: 1500, currency: 'RWF', isAvailable: true },
  { id: '7', name: 'Frites (Chips)', category: 'Food', price: 1000, currency: 'RWF', isAvailable: true },
  { id: '8', name: 'Whole Fish (Tilapia)', category: 'Food', price: 12000, currency: 'RWF', isAvailable: false },
  { id: '9', name: 'Fried Chicken', category: 'Food', price: 4000, currency: 'RWF', isAvailable: true },
];

let ORDERS: Order[] = [];

export const WaiterService = {
  // Menu Methods
  getMenu: async (businessId: string): Promise<MenuItem[]> => {
    await new Promise(r => setTimeout(r, 300)); // Simulate latency
    return ACTIVE_MENU;
  },

  updateMenuItem: async (item: MenuItem): Promise<void> => {
    const idx = ACTIVE_MENU.findIndex(m => m.id === item.id);
    if (idx >= 0) {
      ACTIVE_MENU[idx] = item;
    } else {
      ACTIVE_MENU.push({ ...item, id: Date.now().toString() });
    }
  },

  toggleAvailability: async (id: string): Promise<void> => {
    const item = ACTIVE_MENU.find(m => m.id === id);
    if (item) item.isAvailable = !item.isAvailable;
  },

  // Order Methods
  submitOrder: async (order: Order): Promise<void> => {
    await new Promise(r => setTimeout(r, 600)); // Simulate processing
    ORDERS.unshift(order); // Add to top
  },

  getOrders: async (businessId: string): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 300));
    return ORDERS;
  },

  markOrderSeen: async (orderId: string): Promise<void> => {
    const order = ORDERS.find(o => o.id === orderId);
    if (order) order.status = 'seen';
  }
};
