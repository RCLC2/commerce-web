import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./docs.module.css";

export function DocsHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className={styles.hero}>
    <p className={styles.eyebrow}><span aria-hidden="true" />{eyebrow}</p>
    <h1>{title}</h1>
    <p className={styles.heroDescription}>{description}</p>
  </header>;
}

export function DocsSection({ title, description, children, className, id }: { title: string; description?: string; children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cn(styles.section, className)}>
    <div className={styles.sectionHeading}><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    <div className={styles.sectionBody}>{children}</div>
  </section>;
}

export function CodeBlock({ children, filename }: { children: string; filename: string }) {
  return <details className={styles.codeBlock}>
    <summary>예시 코드 <span>{filename}</span></summary>
    <pre tabIndex={0} aria-label={`${filename} 소스 코드`}><code>{children}</code></pre>
  </details>;
}

export function TokenCard({ name, value, description, swatch }: { name: string; value: string; description: string; swatch?: string }) {
  return <div className={styles.tokenCard}>
    {swatch ? <div className={styles.tokenSwatch} style={{ background: swatch }} aria-hidden="true" /> : null}
    <div className={styles.tokenBody}><p className={styles.tokenName}>{name}</p><p className={styles.tokenValue}>{value}</p><p className={styles.tokenDescription}>{description}</p></div>
  </div>;
}

export function DocsExample({ label = "예시", description, children, padded = true }: { label?: string; description?: string; children: React.ReactNode; padded?: boolean }) {
  return <figure className={styles.example}>
    <p className={styles.exampleLabel}>{label}</p>
    <div className={cn(styles.exampleCanvas, !padded && styles.exampleFullWidth)}>{children}</div>
    {description ? <figcaption className={styles.exampleDescription}>{description}</figcaption> : null}
  </figure>;
}

export function DocsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className={styles.docsLink}>{children}<ArrowUpRight size={16} aria-hidden="true" /></a>;
}
