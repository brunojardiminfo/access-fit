import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  // Guardados para a campanha saber comparar SALE x progressivo sem consultar
  // o servidor. Itens antigos do carrinho podem nao ter — o preco cobrado e
  // sempre recalculado no servidor de qualquer forma.
  precoCheio?: number;
  descontoSale?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number | null;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  count: () => number;
  setCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: "",
      couponDiscount: null,

      addItem: (item) => {
        const items = get().items;
        const key = `${item.productId}-${item.size}-${item.color}`;
        const existing = items.find(
          (i) => i.productId === item.productId && i.size === item.size && i.color === item.color
        );
        if (existing) {
          set({ items: items.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i) });
        } else {
          set({ items: [...items, { ...item, id: key + Date.now() }] });
        }
      },

      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) { get().removeItem(id); return; }
        set({ items: get().items.map((i) => i.id === id ? { ...i, quantity } : i) });
      },

      clearCart: () => set({ items: [], couponCode: "", couponDiscount: null }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
      clearCoupon: () => set({ couponCode: "", couponDiscount: null }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "access-fit-cart" }
  )
);
