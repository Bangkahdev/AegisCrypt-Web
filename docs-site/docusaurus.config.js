// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const { themes } = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "AegisCrypt Docs",
  tagline: "Referensi teknis enkripsi berkas berbasis browser (Bahasa Indonesia)",
  favicon: "img/favicon.svg",

  // Set production URL for deployment
  url: "https://docs.aegiscrypt.bangkah.tech",
  baseUrl: "/",

  // GitHub deployment (not used, using cf deploy)
  organizationName: "Bangkahdev",
  projectName: "AegisCrypt-Web",

  onBrokenLinks: "throw",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  // Indonesian language
  i18n: {
    defaultLocale: "id",
    locales: ["id"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/Bangkahdev/AegisCrypt-Web/edit/main/docs-site/",
          routeBasePath: "/",
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    {
      navbar: {
        title: "AegisCrypt Docs",
        logo: {
          alt: "AegisCrypt Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "doc",
            docId: "ringkasan",
            position: "left",
            label: "Dokumentasi",
          },
          {
            href: "https://aegiscrypt.bangkah.tech",
            label: "Buka Aplikasi",
            position: "right",
            className: "navbar-app-link",
          },
          {
            href: "https://github.com/Bangkahdev/AegisCrypt-Web",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Dokumentasi",
            items: [
              {
                label: "Ringkasan",
                to: "/",
              },
              {
                label: "Mulai Cepat",
                to: "/mulai-cepat",
              },
              {
                label: "Panduan Pengguna",
                to: "/panduan-pengguna",
              },
            ],
          },
          {
            title: "Referensi",
            items: [
              {
                label: "Arsitektur",
                to: "/arsitektur",
              },
              {
                label: "Format File (.aegis v3)",
                to: "/format-file",
              },
              {
                label: "Referensi API",
                to: "/referensi-api",
              },
            ],
          },
          {
            title: "Sumber",
            items: [
              {
                label: "Aplikasi Web",
                href: "https://aegiscrypt.bangkah.tech",
              },
              {
                label: "Kode Sumber (GitHub)",
                href: "https://github.com/Bangkahdev/AegisCrypt-Web",
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} AegisCrypt. Dibangun dengan Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ["bash", "json", "typescript"],
      },
    },
};

module.exports = config;
