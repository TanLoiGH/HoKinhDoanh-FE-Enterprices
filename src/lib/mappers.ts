import type {
  PagedResultDto,
  ProductDetailResponseDto,
  ProductResponseDto,
} from "@/lib/dtos";

export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  slug: string;
}

export interface PagedResult<T> {
  items: T[];
  totalRecords: number;
  pageIndex: number;
  pageSize: number;
}

export function mapPagedResultDto<TIn, TOut>(
  dto: PagedResultDto<TIn>,
  mapItem: (item: TIn) => TOut,
): PagedResult<TOut> {
  const anyDto = dto as unknown as Record<string, unknown>;
  const rawItems =
    (anyDto.Items as TIn[] | undefined) ?? (anyDto.items as TIn[] | undefined);
  const rawTotalRecords =
    (anyDto.TotalRecords as number | undefined) ??
    (anyDto.totalRecords as number | undefined) ??
    0;
  const rawPageIndex =
    (anyDto.PageIndex as number | undefined) ??
    (anyDto.pageIndex as number | undefined) ??
    1;
  const rawPageSize =
    (anyDto.PageSize as number | undefined) ??
    (anyDto.pageSize as number | undefined) ??
    20;

  return {
    items: (rawItems ?? []).map(mapItem),
    totalRecords: rawTotalRecords,
    pageIndex: rawPageIndex,
    pageSize: rawPageSize,
  };
}

export function mapProductResponseDto(dto: ProductResponseDto): Product {
  const anyDto = dto as unknown as Record<string, unknown>;
  const id = (anyDto.Id as number | undefined) ?? (anyDto.id as number);
  const name = (anyDto.Name as string | undefined) ?? (anyDto.name as string);
  const price =
    (anyDto.Price as number | undefined) ?? (anyDto.price as number);
  const slug = (anyDto.Slug as string | undefined) ?? (anyDto.slug as string);
  const imageUrl =
    ((anyDto.ImageUrl as string | null | undefined) ??
      (anyDto.imageUrl as string | null | undefined)) ??
    null;

  return {
    id,
    name,
    price,
    imageUrl,
    slug,
  };
}

export function mapProductDetailResponseDto(dto: ProductDetailResponseDto) {
  const anyDto = dto as unknown as Record<string, unknown>;
  const variants =
    (anyDto.Variants as Record<string, unknown>[] | undefined) ??
    (anyDto.variants as Record<string, unknown>[] | undefined) ??
    [];
  const images =
    (anyDto.Images as string[] | undefined) ??
    (anyDto.images as string[] | undefined) ??
    [];

  return {
    productName:
      (anyDto.ProductName as string | undefined) ??
      (anyDto.productName as string),
    slug: (anyDto.Slug as string | undefined) ?? (anyDto.slug as string),
    categoryName:
      (anyDto.CategoryName as string | undefined) ??
      (anyDto.categoryName as string),
    brandName:
      ((anyDto.BrandName as string | null | undefined) ??
        (anyDto.brandName as string | null | undefined)) ??
      "",
    defaultPrice:
      (anyDto.DefaultPrice as number | undefined) ??
      (anyDto.defaultPrice as number),
    variants: variants.map((v) => ({
      id: (v.Id as number | undefined) ?? (v.id as number),
      sku: (v.SKU as string | undefined) ?? (v.sku as string),
      price: (v.Price as number | undefined) ?? (v.price as number),
      availableStock:
        (v.AvailableStock as number | undefined) ??
        (v.availableStock as number),
      attributesInfo:
        (v.AttributesInfo as string | undefined) ??
        (v.attributesInfo as string),
    })),
    images,
  };
}
