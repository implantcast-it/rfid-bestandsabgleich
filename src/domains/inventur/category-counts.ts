import type { ProductCategoryCounts } from "@/domains/inventur/types";

export const countProductCategories = (
  rows: Array<{ kennzeichen_3: string }>
): ProductCategoryCounts => {
  const counts: ProductCategoryCounts = {
    implantate: 0,
    siebe: 0,
    instrumente: 0,
    weitere: 0,
  };

  for (const row of rows) {
    switch (row.kennzeichen_3.trim().toUpperCase()) {
      case "IMP":
        counts.implantate += 1;
        break;
      case "SIEB":
        counts.siebe += 1;
        break;
      case "INST":
        counts.instrumente += 1;
        break;
      default:
        counts.weitere += 1;
    }
  }

  return counts;
};
