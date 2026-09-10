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
  // Qual peca do conjunto a cliente quer. Vazio = conjunto completo, ou peca
  // que nao e conjunto. O estoque continua sendo o do conjunto: quem leva so o
  // top desmonta um conjunto, e e isso que sai do estoque.
  componentName?: string;
  quantity: number;
};

/**
 * Quem esta comprando. Pedimos nome e telefone na primeira peca que entra no
 * carrinho, para que toda sacola tenha dono -- inclusive a que nunca vira
 * pedido, que e justamente a que voce quer retomar.
 */
export type Cliente = { nome: string; telefone: string };

/**
 * Oferecer um "agora nao" no pedido de identificacao. Em false ela so adiciona
 * depois de preencher; em true, quem nao quiser se identificar segue comprando
 * e a sacola fica anonima. Uma palavra, caso a barreira se mostre cara demais
 * em conversao.
 */
export const PERMITIR_PULAR = false;

type CartStore = {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number | null;
  /** Nome e telefone de quem esta montando a sacola. */
  cliente: Cliente | null;
  /** Peca esperando a identificacao para entrar de fato no carrinho. */
  pendente: Omit<CartItem, "id"> | null;
  identificar: (cliente: Cliente) => void;
  pularIdentificacao: () => void;
  cancelarPendente: () => void;
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
      cliente: null,
      pendente: null,

      /** Guarda quem e a cliente e solta a peca que estava esperando. */
      identificar: (cliente) => {
        const esperando = get().pendente;
        set({ cliente, pendente: null });
        if (esperando) {
          get().addItem(esperando);
          set({ isOpen: true });
        }
      },

      /** So existe com PERMITIR_PULAR: adiciona sem saber quem e. */
      pularIdentificacao: () => {
        const esperando = get().pendente;
        set({ pendente: null, cliente: { nome: "", telefone: "" } });
        if (esperando) {
          get().addItem(esperando);
          set({ isOpen: true });
        }
      },

      cancelarPendente: () => set({ pendente: null }),

      addItem: (item) => {
        // Sem saber quem e, a peca fica esperando e o modal aparece
        if (!get().cliente) {
          set({ pendente: item });
          return;
        }
        const items = get().items;
        const key = `${item.productId}-${item.size}-${item.color}-${item.componentName || ""}`;
        const existing = items.find(
          (i) => i.productId === item.productId && i.size === item.size && i.color === item.color && (i.componentName || "") === (item.componentName || "")
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
