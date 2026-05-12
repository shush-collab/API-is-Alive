export type Product = {
  id: string;
  name: string;
  price: number;
};

export const products: Product[] = [
  { id: "prod_keyboard", name: "Mechanical Keyboard", price: 89.99 },
  { id: "prod_phone", name: "Smart Phone", price: 699.99 },
  { id: "prod_mouse", name: "Wireless Mouse", price: 39.99 },
];
