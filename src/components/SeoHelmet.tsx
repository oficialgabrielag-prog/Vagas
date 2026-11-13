import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHelmetProps {
  title: string;
  description: string;
  type?: 'website' | 'article' | 'profile';
  image?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const cleanText = (value: string, maxLen: number): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
};

export const SeoHelmet: React.FC<SeoHelmetProps> = ({
  title,
  description,
  type = 'website',
  image,
  canonicalPath,
  jsonLd
}) => {
  const finalTitle = cleanText(title, 70) || 'CuneneVagas | Empregos, Vagas e Marketplace no Cunene';
  const finalDescription = cleanText(
    description,
    160
  ) || 'Plataforma profissional de empregos, exames técnicos, empresas e marketplace em Angola.';

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://cunenevagas.online';
  const pathname =
    canonicalPath ??
    (typeof window !== 'undefined' && window.location?.pathname
      ? window.location.pathname
      : '/');
  const canonicalUrl = `${origin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  const safeImage =
    image && (image.startsWith('http://') || image.startsWith('https://'))
      ? image
      : undefined;

  return (
    <Helmet prioritizeSeoTags>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="CuneneVagas" />
      <meta property="og:locale" content="pt_AO" />
      {safeImage && <meta property="og:image" content={safeImage} />}

      <meta name="twitter:card" content={safeImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {safeImage && <meta name="twitter:image" content={safeImage} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};
