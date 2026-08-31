import { defaultTitle } from "./defaultConfiguration";

interface ConfigurationRequiredProps {
  /** Names of the required environment variables that are missing. */
  missingEnv: string[];
}

/**
 * Guidance screen shown when required Supabase environment variables are
 * missing. It replaces the previous behavior of throwing at provider-build
 * time (which rendered a blank white page) with an actionable message that
 * names each missing variable and explains how to set it.
 *
 * Rendered outside the <Admin> tree, so it must not depend on ra-core
 * context (translations, configuration store) — all copy is self-contained.
 */
export const ConfigurationRequired = ({
  missingEnv,
}: ConfigurationRequiredProps) => {
  return (
    <div className="h-screen p-8">
      <div className="h-full text-center">
        <div className="max-w-md mx-auto h-full flex flex-col justify-center gap-4">
          <h1 className="text-2xl font-bold mb-2">Configuration required</h1>
          <p className="text-base text-muted-foreground">
            {defaultTitle} can't start because one or more required environment
            variables are missing.
          </p>
          <div className="text-left">
            <p className="text-sm font-semibold mb-2">Missing variables</p>
            <ul className="list-disc list-inside space-y-1">
              {missingEnv.map((name) => (
                <li key={name}>
                  <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">
                    {name}
                  </code>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground text-left">
            Set these in a <code className="font-mono">.env</code> file at the
            project root for local development, or in your hosting / preview
            deployment's environment variables, then reload the page.
          </p>
        </div>
      </div>
    </div>
  );
};
