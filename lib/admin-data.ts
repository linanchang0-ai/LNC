export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  featured: boolean;
  status: "Publicado" | "Borrador";
};

export type AdminOrder = {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: "Pagado" | "En tránsito" | "Pendiente" | "Cancelado";
  date: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  city: string;
  totalSpent: number;
  orders: number;
};

export type AdminReturn = {
  id: string;
  customer: string;
  reason: string;
  status: "En revisión" | "Aprobada" | "Rechazada";
  orderId: string;
};

export type AdminRefund = {
  id: string;
  customer: string;
  amount: number;
  status: "Pendiente" | "Procesado" | "Rechazado";
  orderId: string;
};

export const adminInitialProducts: AdminProduct[] = [
  { id: "prod-01", name: "Basta de Encaje", category: "Hogar", price: 2499, stock: 12, featured: true, status: "Publicado" },
  { id: "prod-02", name: "Mochila Monarca", category: "Outdoor", price: 3199, stock: 8, featured: true, status: "Publicado" },
  { id: "prod-03", name: "Cinturón Lazio", category: "Accesorios", price: 1799, stock: 4, featured: false, status: "Borrador" },
  { id: "prod-04", name: "Lámpara Aria", category: "Hogar", price: 2899, stock: 16, featured: true, status: "Publicado" },
];

export const adminInitialOrders: AdminOrder[] = [
  { id: "TS-1042", customer: "Ana García", email: "ana@email.com", total: 4798, status: "Pagado", date: "2026-08-29" },
  { id: "TS-1043", customer: "Luis Ortega", email: "luis@email.com", total: 2599, status: "En tránsito", date: "2026-08-30" },
  { id: "TS-1044", customer: "María López", email: "maria@email.com", total: 1380, status: "Pendiente", date: "2026-08-31" },
  { id: "TS-1045", customer: "Ricardo Vega", email: "ricardo@email.com", total: 3499, status: "Cancelado", date: "2026-09-01" },
];

export const adminInitialCustomers: AdminCustomer[] = [
  { id: "c-01", name: "Ana García", email: "ana@email.com", city: "CDMX", totalSpent: 11250, orders: 4 },
  { id: "c-02", name: "Luis Ortega", email: "luis@email.com", city: "Guadalajara", totalSpent: 6840, orders: 2 },
  { id: "c-03", name: "María López", email: "maria@email.com", city: "Monterrey", totalSpent: 9210, orders: 3 },
];

export const adminInitialReturns: AdminReturn[] = [
  { id: "RET-204", customer: "Alicia Torres", reason: "Producto defectuoso", status: "En revisión", orderId: "TS-1014" },
  { id: "RET-205", customer: "Mauricio Cruz", reason: "Cambio de talla", status: "Aprobada", orderId: "TS-1018" },
  { id: "RET-206", customer: "Nora Silva", reason: "No coincidía con descripción", status: "Rechazada", orderId: "TS-1021" },
];

export const adminInitialRefunds: AdminRefund[] = [
  { id: "REF-301", customer: "Alicia Torres", amount: 2499, status: "Pendiente", orderId: "TS-1014" },
  { id: "REF-302", customer: "Nora Silva", amount: 1799, status: "Procesado", orderId: "TS-1021" },
  { id: "REF-303", customer: "Mauricio Cruz", amount: 3199, status: "Rechazado", orderId: "TS-1018" },
];

const ADMIN_STORAGE_KEY = "lnc_sports_admin_state";

export function getAdminState() {
  if (typeof window === "undefined") {
    return {
      products: adminInitialProducts,
      orders: adminInitialOrders,
      customers: adminInitialCustomers,
      returns: adminInitialReturns,
      refunds: adminInitialRefunds,
    };
  }

  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) {
    return {
      products: adminInitialProducts,
      orders: adminInitialOrders,
      customers: adminInitialCustomers,
      returns: adminInitialReturns,
      refunds: adminInitialRefunds,
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      products?: AdminProduct[];
      orders?: AdminOrder[];
      customers?: AdminCustomer[];
      returns?: AdminReturn[];
      refunds?: AdminRefund[];
    };

    return {
      products: parsed.products ?? adminInitialProducts,
      orders: parsed.orders ?? adminInitialOrders,
      customers: parsed.customers ?? adminInitialCustomers,
      returns: parsed.returns ?? adminInitialReturns,
      refunds: parsed.refunds ?? adminInitialRefunds,
    };
  } catch {
    return {
      products: adminInitialProducts,
      orders: adminInitialOrders,
      customers: adminInitialCustomers,
      returns: adminInitialReturns,
      refunds: adminInitialRefunds,
    };
  }
}

export function saveAdminState(next: Partial<ReturnType<typeof getAdminState>>) {
  if (typeof window === "undefined") return;
  const current = getAdminState();
  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ ...current, ...next }));
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
}
