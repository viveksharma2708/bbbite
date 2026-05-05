export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  updatedAt: any;
}

export type OrderStatus = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id?: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  paymentMethod: 'online' | 'cod';
  paymentStatus: 'pending' | 'paid';
  estimatedDeliveryTime?: any;
  cancellationReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface StoreSettings {
  isAcceptingOrders: boolean;
  announcement: string;
  estimatedPrepTime: string;
}
