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

interface RaceConditionCartProps {
  lang: "ko" | "en";
}

export default function RaceConditionCart({ lang }: RaceConditionCartProps) {
  const allProducts: Product[] = [
    {
      id: 1,
      name: lang === "ko" ? "포토카드" : "Photocard",
      price: 5000,
      color: lang === "ko" ? "블랙" : "Black",
    },
    {
      id: 2,
      name: lang === "ko" ? "키링" : "Keyring",
      price: 15000,
      color: lang === "ko" ? "블랙" : "Black",
    },
    {
      id: 3,
      name: lang === "ko" ? "스티커" : "Sticker",
      price: 4000,
      color: lang === "ko" ? "화이트" : "White",
    },
    {
      id: 4,
      name: lang === "ko" ? "머그컵" : "Mug",
      price: 12000,
      color: lang === "ko" ? "화이트" : "White",
    },
  ];

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
        results = results.filter(
          (p) => p.color === (lang === "ko" ? "블랙" : "Black"),
        );
      }
      setFilteredProducts(results);
      setIsLoading(false);
    }, delay);
  };

  const filteredProductIds = new Set(filteredProducts.map((p) => p.id));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold">
          {lang === "ko" ? "성열굿즈샵🛍️" : "Seongyeol's Goods Shop🛍️"}
        </h2>
      </CardHeader>
      <Separator />
      <CardHeader>
        <CardTitle>{lang === "ko" ? "상품 필터" : "Product Filter"}</CardTitle>
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
            <Label htmlFor="filter-none-react">
              {lang === "ko" ? "필터 없음" : "No Filter"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="price" id="filter-price-react" />
            <Label htmlFor="filter-price-react">
              {lang === "ko"
                ? "가격: 10,000원 이하 (1.5초)"
                : "Price: under ₩10,000 (1.5s)"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="color" id="filter-color-react" />
            <Label htmlFor="filter-color-react">
              {lang === "ko" ? "색상: 블랙 (0.5초)" : "Color: Black (0.5s)"}
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
      <Separator />
      <CardHeader>
        <CardTitle>
          {lang === "ko" ? "상품 목록" : "Products"}{" "}
          {isLoading && (lang === "ko" ? "(로딩 중...)" : "(Loading...)")}
        </CardTitle>
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
                {p.name} - ₩{p.price} ({p.color})
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
