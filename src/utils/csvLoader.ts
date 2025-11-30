import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";
import { Exhibitor, CATEGORIES, Category } from "../types";

// The 'as const' assertion on CATEGORIES makes it a readonly tuple.
// This type guard checks if a string value is one of the allowed categories.
const isCategory = (value: any): value is Category => {
  return CATEGORIES.includes(value);
};

export const loadExhibitors = async (): Promise<Exhibitor[]> => {
  const csvFilePath = path.join(process.cwd(), "data", "exhibitors.csv");

  try {
    const csvFile = await fs.readFile(csvFilePath, "utf-8");

    // We parse the CSV file using papaparse.
    // 'header: true' treats the first row as headers.
    const results = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    const exhibitors: Exhibitor[] = results.data.reduce((acc: Exhibitor[], row: any, index: number) => {
      // Basic validation for each row
      if (!row.id || !row.name || !row.category || !row.shortDesc || !row.longDesc || !row.imageUrl) {
        console.warn(`Row ${index + 2} is missing required fields. Skipping.`);
        return acc;
      }

      // Validate category
      if (!isCategory(row.category)) {
        console.warn(`Row ${index + 2} has an invalid category: "${row.category}". Skipping.`);
        return acc;
      }

      // We trim the data to remove any leading/trailing whitespace.
      const exhibitor: Exhibitor = {
        id: row.id.trim(),
        name: row.name.trim(),
        category: row.category,
        shortDesc: row.shortDesc.trim(),
        longDesc: row.longDesc.trim(),
        imageUrl: row.imageUrl.trim(),
        websiteUrl: row.websiteUrl ? row.websiteUrl.trim() : undefined,
        address: row.address ? row.address.trim() : undefined,
        facebookUrl: row.facebookUrl ? row.facebookUrl.trim() : undefined,
        instagramUrl: row.instagramUrl ? row.instagramUrl.trim() : undefined,
        twitterUrl: row.twitterUrl ? row.twitterUrl.trim() : undefined,
      };

      acc.push(exhibitor);
      return acc;
    }, []);

    return exhibitors;
  } catch (error) {
    console.error("Error reading or parsing CSV file:", error);
    // Return an empty array in case of an error.
    return [];
  }
};
