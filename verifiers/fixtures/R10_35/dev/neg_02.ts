import axios from 'axios';
import { CartService } from '@/modules/cart/cart.service';
import { Cart } from '@/models/cart';
import { withRetry } from '@/shared/retry';

export async function syncCart(cart: Cart): Promise<void> {
  const service = new CartService(axios.create({ baseURL: '/api' }));
  await withRetry(() => service.push(cart));
}
