// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title = "Prime Patties & Foods | Order Online",
  description = "Order delicious food online from Prime Patties & Foods. Fresh ingredients, amazing taste, and quick delivery. Browse our menu and order now!",
  image = "/ppflogo.png",
  url
}) {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const siteName = "Prime Patties & Foods";
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": siteName,
    "description": description,
    "image": image,
    "url": currentUrl,
    "servesCuisine": ["Fast Food", "Burgers", "Beverages"],
    "priceRange": "₹₹",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
    }
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}