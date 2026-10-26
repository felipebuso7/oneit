import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OneIT — Gestão de Serviços e Operações",
    short_name: "OneIT",
    description: "Gestão de serviços, operações de campo e governança de TI.",
    lang: "pt-BR",
    start_url: "/portal/field",
    scope: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#062c59",
    icons: [192, 512].map((size) => ({
      src: `/pwa/icons/${size}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
