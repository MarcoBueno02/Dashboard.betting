import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth discovery (RFC 8414 / RFC 9728) exige servir em /.well-known/*
  // na raiz do domínio. Em vez de uma pasta literal ".well-known" dentro de
  // app/ (comportamento de roteamento não documentado pro App Router),
  // reescreve pra rotas normais dentro de src/app/api/oauth/.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/mcp", destination: "/api/oauth/protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/authorization-server" },
    ];
  },
};

export default nextConfig;
