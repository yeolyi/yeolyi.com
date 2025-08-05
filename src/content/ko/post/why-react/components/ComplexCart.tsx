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

interface ComplexCartProps {
  lang: "ko" | "en";
}
export default function ComplexCart({ lang }: ComplexCartProps) {
  const products: Product[] = [
    { id: "1", name: lang === "ko" ? "포토카드" : "Photocard" },
    { id: "2", name: lang === "ko" ? "키링" : "Keyring" },
    { id: "3", name: lang === "ko" ? "스티커" : "Sticker" },
    { id: "4", name: lang === "ko" ? "머그컵" : "Mug" },
  ];
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
        <h2 className="text-xl font-bold">
          {lang === "ko" ? "성열굿즈샵🛍️" : "Seongyeol's Goods Shop🛍️"}
        </h2>
      </CardHeader>
      <Separator />
      <CardHeader>
        <CardTitle>{lang === "ko" ? "상품 목록" : "Products"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between">
              <span>{product.name}</span>
              <Button variant="outline" onClick={() => addToCart(product)}>
                {lang === "ko" ? "추가" : "Add"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle>{lang === "ko" ? "장바구니" : "Cart"}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-2 pl-5">
          {cart.length === 0 ? (
            <li>
              {lang === "ko"
                ? "장바구니가 비어있습니다."
                : "Your cart is empty."}
            </li>
          ) : (
            cart.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <div>
                  {item.name} - {lang === "ko" ? "수량" : "Quantity"}:{" "}
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
