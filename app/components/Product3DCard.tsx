import Link from "next/link";
import type { CSSProperties } from "react";

type Product3DCardProps = {
  product: {
    slug: string;
    name: string;
    subtitle: string;
    logoText: string;
    theme: string;
  };
  index: number;
  isPopular?: boolean;
};

export default function Product3DCard({
  product,
  index,
  isPopular = false,
}: Product3DCardProps) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={
        isPopular
          ? "ai-product-card ai-product-card-3d featured"
          : "ai-product-card ai-product-card-3d"
      }
      style={
        {
          "--stagger": `${index * 45}ms`,
        } as CSSProperties
      }
    >
      {isPopular && <div className="product-badge-3d">محبوب</div>}

      <div className={`product-visual ${product.theme}`}>
        <span>{product.logoText}</span>
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{product.subtitle}</p>
      </div>
    </Link>
  );
}