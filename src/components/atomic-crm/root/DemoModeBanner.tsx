/**
 * Notice banner shown when the CRM is running on the in-browser FakeRest
 * data provider (no Supabase backend configured, or demo mode forced).
 *
 * It warns the viewer that every record is mock data living in the browser:
 * nothing is persisted and a reload resets the state.
 *
 * Rendered outside the <Admin> tree in some code paths, so it must NOT depend
 * on ra-core context (translations, configuration store) — all copy is
 * self-contained and it only renders static markup.
 */
export const DemoModeBanner = () => {
  return (
    <div
      role="status"
      className="w-full border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <span className="font-semibold">Demo mode</span> — you are viewing
      in-browser mock data, not a real backend. Nothing is saved and reloading
      the page resets everything.
    </div>
  );
};
