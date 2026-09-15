import type { CmsPage } from '@/lib/api';
import styles from './CmsPageRenderer.module.css';

export interface CmsPageRendererLabels {
  lastUpdated: string;
  notFound: string;
}

export interface CmsPageRendererProps {
  locale: 'bn' | 'en';
  page: CmsPage;
  labels: CmsPageRendererLabels;
}

/**
 * Renders a CMS page body.
 * NOTE: bodyHtml is treated as sanitized HTML from the CMS (server-side
 * sanitization per TDD §10.1); we do not re-escape it here. The CMS
 * editor only allows a safe subset of tags.
 */
export function CmsPageRenderer({ locale, page, labels }: CmsPageRendererProps) {
  const title = locale === 'bn' ? page.titleBn : page.titleEn;
  const body = locale === 'bn' ? page.bodyBn : page.bodyEn;

  if (page.status !== 'PUBLISHED') {
    return <p className={styles.notFound}>{labels.notFound}</p>;
  }

  return (
    <article className={styles.article}>
      <header className={styles.head}>
        <h1 className={styles.h1}>{title}</h1>
        {page.publishedAt ? (
          <p className={styles.meta}>
            {labels.lastUpdated.replace(
              '{date}',
              new Date(page.publishedAt).toLocaleDateString(
                locale === 'bn' ? 'bn-BD' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              ),
            )}
          </p>
        ) : null}
      </header>

      {body ? (
        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : null}
    </article>
  );
}