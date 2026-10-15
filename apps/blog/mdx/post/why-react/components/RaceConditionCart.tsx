import RadioGroup from "@yeolyi/ui/RadioGroup";
import { useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  color: string;
}

const ALL_PRODUCTS: Product[] = [
  { id: 1, name: "포토카드", price: 5000, color: "블랙" },
  { id: 2, name: "키링", price: 15000, color: "블랙" },
  { id: 3, name: "스티커", price: 4000, color: "화이트" },
  { id: 4, name: "머그컵", price: 12000, color: "화이트" },
];

const won = (n: number) => `₩${n.toLocaleString()}`;

export default function RaceConditionCart() {
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(ALL_PRODUCTS);
  const [isLoading, setIsLoading] = useState(false);

  const applyAndFetch = (
    filterType: "price" | "color" | "none",
    delay: number,
  ) => {
    if (filterType === "none") {
      setFilteredProducts(ALL_PRODUCTS);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    setTimeout(() => {
      let results = [...ALL_PRODUCTS];
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
    <div className="prose py-[1rlh]">
      <div className="grid gap-[1rlh] sm:grid-cols-2 sm:gap-0">
        <div className="border-border sm:border-r sm:pe-6">
          <h3 className="mt-0">상품 필터</h3>
          <div className="mt-[0.5rlh]">
            <RadioGroup
              orientation="vertical"
              defaultValue="none"
              onValueChange={(value) => {
                const v = value as "price" | "color" | "none";
                const delays = { price: 1500, color: 500, none: 0 };
                applyAndFetch(v, delays[v]);
              }}
              options={[
                { value: "none", label: "필터 없음" },
                { value: "price", label: "가격: 10,000원 이하 (1.5초)" },
                { value: "color", label: "색상: 블랙 (0.5초)" },
              ]}
            />
          </div>
        </div>
        <div className="sm:ps-6">
          <h3 className="mt-0">상품 목록 {isLoading && "(로딩 중...)"}</h3>
          <ul className="mt-[0.5rlh]">
            {ALL_PRODUCTS.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-[1ch] ${
                  // 걸러진 상품은 보조 색으로 물린다
                  filteredProductIds.has(p.id) ? "" : "text-muted-foreground"
                }`}
              >
                <span>
                  {p.name}{" "}
                  <span className="text-muted-foreground">{p.color}</span>
                </span>
                <span className="text-muted-foreground ms-auto">
                  {won(p.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
