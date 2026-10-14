import Button from "@yeolyi/ui/Button";
import { sumBy } from "es-toolkit";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}
interface CartItem extends Product {
  quantity: number;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "포토카드", price: 5000 },
  { id: "2", name: "키링", price: 15000 },
  { id: "3", name: "스티커", price: 4000 },
  { id: "4", name: "머그컵", price: 12000 },
];

const won = (n: number) => `₩${n.toLocaleString()}`;

export default function ComplexCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const total = sumBy(cart, (item) => item.price * item.quantity);

  return (
    <div className="prose py-[1lh]">
      <div className="grid gap-[1lh] sm:grid-cols-2 sm:gap-0">
        <div className="border-border sm:border-r sm:pe-6">
          <h3 className="mt-0">상품 목록</h3>
          <ul className="mt-[0.5lh]">
            {PRODUCTS.map((product) => (
              <li key={product.id} className="flex items-center gap-[1ch]">
                {product.name}
                <span className="text-muted-foreground ms-auto">
                  {won(product.price)}
                </span>
                <Button onClick={() => addToCart(product)}>+</Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:ps-6">
          <h3 className="mt-0">장바구니</h3>
          {cart.length === 0 ? (
            <p className="text-muted-foreground mt-[0.5lh]">
              장바구니가 비어있습니다.
            </p>
          ) : (
            <>
              <ul className="mt-[0.5lh]">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center gap-[1ch]">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-muted-foreground ms-auto">
                      {won(item.price * item.quantity)}
                    </span>
                    <span className="flex gap-1">
                      <Button onClick={() => updateQuantity(item.id, -1)}>
                        -
                      </Button>
                      <Button onClick={() => updateQuantity(item.id, 1)}>
                        +
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-border mt-[0.5lh] flex items-center border-t pt-[0.5lh]">
                합계
                <span className="ms-auto">{won(total)}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
