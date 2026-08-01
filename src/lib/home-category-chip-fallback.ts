import type { HomeCategoryChip } from "./types";

export const fallbackHomeCategoryChips: HomeCategoryChip[] = [
  { id: 1, sequence: 1, chip_type: "CATEGORY", category_id: 1, icon_url: "/icons/home-category/tops.svg", status: "ACTIVE", title: "상의", href: "/products?categoryID=1" },
  { id: 2, sequence: 2, chip_type: "CATEGORY", category_id: 2, icon_url: "/icons/home-category/pants.svg", status: "ACTIVE", title: "팬츠", href: "/products?categoryID=2" },
  { id: 3, sequence: 3, chip_type: "CATEGORY", category_id: 3, icon_url: "/icons/home-category/dress.svg", status: "ACTIVE", title: "원피스", href: "/products?categoryID=3" },
  { id: 4, sequence: 4, chip_type: "CATEGORY", category_id: 4, icon_url: "/icons/home-category/outer.svg", status: "ACTIVE", title: "아우터", href: "/products?categoryID=4" },
  { id: 5, sequence: 5, chip_type: "CATEGORY", category_id: 5, icon_url: "/icons/home-category/bags.svg", status: "ACTIVE", title: "가방", href: "/products?categoryID=5" },
  { id: 6, sequence: 6, chip_type: "CATEGORY", category_id: 6, icon_url: "/icons/home-category/skirts.svg", status: "ACTIVE", title: "스커트", href: "/products?categoryID=6" },
  { id: 7, sequence: 7, chip_type: "CATEGORY", category_id: 7, icon_url: "/icons/home-category/shoes.svg", status: "ACTIVE", title: "슈즈", href: "/products?categoryID=7" },
  { id: 8, sequence: 8, chip_type: "CATEGORY", category_id: 8, icon_url: "/icons/home-category/accessories.svg", status: "ACTIVE", title: "액세서리", href: "/products?categoryID=8" },
  { id: 9, sequence: 9, chip_type: "CATEGORY_EVENT", category_event_id: 1, icon_url: "/icons/home-category/event-shoes.svg", status: "ACTIVE", title: "슈즈 위크", href: "/events/1" },
  { id: 10, sequence: 10, chip_type: "CATEGORY_EVENT", category_event_id: 2, icon_url: "/icons/home-category/event-accessories.svg", status: "ACTIVE", title: "액세서리 데이", href: "/events/2" },
];
