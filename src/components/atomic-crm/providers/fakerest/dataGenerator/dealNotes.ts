import { datatype, lorem, random } from "faker/locale/en_US";

import { generateNextAction } from "./nextAction";
import type { Db } from "./types";
import { randomDate } from "./utils";

export const generateDealNotes = (db: Db) => {
  return Array.from(Array(300).keys()).map((id) => {
    const deal = random.arrayElement(db.deals);
    const date = randomDate(new Date(db.deals[deal.id as number].created_at));
    return {
      id,
      deal_id: deal.id,
      text: lorem.paragraphs(datatype.number({ min: 1, max: 4 })),
      date: date.toISOString(),
      sales_id: deal.sales_id,
      ...generateNextAction(date),
    };
  });
};
