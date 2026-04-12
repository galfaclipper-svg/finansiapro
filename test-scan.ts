import { scanAndCategorizeTransaction } from "./src/ai/flows/scan-and-categorize-transaction-flow";

async function main() {
  try {
    const res = await scanAndCategorizeTransaction({
      imageDataUri: "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=",
      coaCategories: ["Utilities", "Office Supplies"]
    });
    console.log("Success:", res);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
