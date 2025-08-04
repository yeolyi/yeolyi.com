"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import React, { useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  color: string;
}

const allProducts: Product[] = [
  { id: 1, name: "포토카드", price: 5000, color: "블랙" },
  { id: 2, name: "키링", price: 15000, color: "블랙" },
  { id: 3, name: "스티커", price: 4000, color: "화이트" },
  { id: 4, name: "머그컵", price: 12000, color: "화이트" },
];

export default function RaceConditionCart() {
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(allProducts);
  const [isLoading, setIsLoading] = useState(false);

  const applyAndFetch = (
    filterType: "price" | "color" | "none",
    delay: number,
  ) => {
    if (filterType === "none") {
      setFilteredProducts(allProducts);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    setTimeout(() => {
      let results = [...allProducts];
      if (filterType === "price") {
        results = results.filter((p) => p.price <= 10000);
      } else if (filterType === "color") {
        results = results.filter((p) => p.color === "블랙");
      }
      setFilteredProducts(results);
      setIsLoading(false);
    }, delay);
  };

  const filteredProductIds = new Set(filteredProducts.map((p) => p.id));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">성열굿즈샵🛍️</h2>
      </CardHeader>
      <Separator />
      <CardHeader>
        <CardTitle>상품 필터</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RadioGroup
          defaultValue="none"
          onValueChange={(value: "price" | "color" | "none") => {
            const options = {
              price: { delay: 1500 },
              color: { delay: 500 },
              none: { delay: 0 },
            };
            applyAndFetch(value, options[value].delay);
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="filter-none-react" />
            <Label htmlFor="filter-none-react">필터 없음</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price" id="filter-price-react" />
            <Label htmlFor="filter-price-react">
              가격: 10,000원 이하 (1.5초)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="color" id="filter-color-react" />
            <Label htmlFor="filter-color-react">색상: 블랙 (0.5초)</Label>
          </div>
        </RadioGroup>
      </CardContent>
      <Separator />
      <CardHeader>
        <CardTitle>상품 목록 {isLoading && "(로딩 중...)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="min-h-[100px]">
          <ul className="list-disc space-y-1 pl-5">
            {allProducts.map((p) => (
              <li
                key={p.id}
                className={
                  filteredProductIds.has(p.id)
                    ? "font-extrabold"
                    : "text-muted-foreground"
                }
              >
                {p.name} - {p.price}원 ({p.color})
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
