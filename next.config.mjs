/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Applica questi headers a tutte le route
        source: '/:path*',
        headers: [
          {
            // Permetti embedding in iframe da qualsiasi dominio
            // Se vuoi restringere solo a Shopify, usa: frame-ancestors https://*.myshopify.com https://tuodominio.com
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.myshopify.com https://* http://*"
          },
          {
            // Rimuovi la restrizione X-Frame-Options (deprecato ma ancora usato)
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          }
        ],
      },
    ];
  },
};

export default nextConfig;