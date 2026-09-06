import type { Meta } from "@storybook/react-vite";
import type { DataProvider } from "ra-core";
import { Route, Routes } from "react-router";

import { buildCompany, StoryWrapper } from "@/test/StoryWrapper";
import { CompanyEdit } from "./CompanyEdit";
import { CompanyShow } from "./CompanyShow";

const meta = {
  title: "Atomic CRM/Companies/Company Edit",
  parameters: {
    layout: "fullscreen",
  },
  globals: {
    viewport: { value: "responsive", isRotated: false },
  },
} satisfies Meta;

export default meta;

/**
 * The edit form and the show page on the same router, because `<CompanyEdit>`
 * redirects to `show` once the record is saved. Mounting both is what makes the
 * save -> display round trip observable end to end.
 */
export const CompanyEditBasic = ({
  dataProvider = {},
  silent,
}: {
  dataProvider?: Partial<DataProvider>;
  silent?: boolean;
}) => (
  <StoryWrapper
    initialEntries={["/companies/1"]}
    data={{ companies: [buildCompany({ id: 1 })] }}
    dataProvider={dataProvider}
    silent={silent}
  >
    <Routes>
      <Route path="/companies/:id" element={<CompanyEdit />} />
      <Route path="/companies/:id/show" element={<CompanyShow />} />
    </Routes>
  </StoryWrapper>
);

export const CompanyEditWithCampaign = ({
  dataProvider = {},
  silent,
}: {
  dataProvider?: Partial<DataProvider>;
  silent?: boolean;
}) => (
  <StoryWrapper
    initialEntries={["/companies/1"]}
    data={{
      companies: [
        buildCompany({
          id: 1,
          campaign: "Year-End Renewal",
          campaign_status: "planning",
        }),
      ],
    }}
    dataProvider={dataProvider}
    silent={silent}
  >
    <Routes>
      <Route path="/companies/:id" element={<CompanyEdit />} />
      <Route path="/companies/:id/show" element={<CompanyShow />} />
    </Routes>
  </StoryWrapper>
);
