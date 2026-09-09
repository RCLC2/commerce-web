import { DocsExample, DocsSection } from "./docs-content";
import { DemoSource, type DemoName } from "./docs-source";
import styles from "./docs.module.css";

type ComponentReferenceProps = {
  id: DemoName;
  title: string;
  description: string;
  usage: string;
  properties: ReadonlyArray<readonly [string, string]>;
  children: React.ReactNode;
};

export function ComponentReference({
  id,
  title,
  description,
  usage,
  properties,
  children,
}: ComponentReferenceProps) {
  return (
    <DocsSection id={id} title={title} description={description}>
      <DocsExample description={usage}>{children}</DocsExample>
      <div className={styles.referenceDetails}>
        <details className={styles.propsDisclosure}>
          <summary>주요 속성</summary>
          <dl>
            {properties.map(([name, detail]) => (
              <div key={name}>
                <dt>
                  <code>{name}</code>
                </dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </details>
        <DemoSource name={id} />
      </div>
    </DocsSection>
  );
}
