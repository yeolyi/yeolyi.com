"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";

interface Product {
  id: string;
  name: string;
}

interface CartItem extends Product {
  quantity: number;
}

const products: Product[] = [
  { id: "1", name: "포토카드" },
  { id: "2", name: "키링" },
  { id: "3", name: "스티커" },
  { id: "4", name: "머그컵" },
];

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
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (item.id === productId) {
          return { ...item, quantity: item.quantity + change };
        }
        return item;
      });
      return updatedCart.filter((item) => item.quantity > 0);
    });
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">성열굿즈샵🛍️</h2>
      </CardHeader>
      <Separator />
      <CardHeader>
        <CardTitle>상품 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between">
              <span>{product.name}</span>
              <Button variant="outline" onClick={() => addToCart(product)}>
                추가
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle>장바구니</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-2 pl-5">
          {cart.length === 0 ? (
            <li>장바구니가 비어있습니다.</li>
          ) : (
            cart.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <div>
                  {item.name} - 수량:{" "}
                  <span className="quantity">{item.quantity}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <Plus />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
