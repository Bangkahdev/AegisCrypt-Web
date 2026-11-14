// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const { themes } = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "AegisCrypt Docs",
  tagline: "Dokumentasi resmi AegisCrypt untuk enkripsi berkas lokal di browser",
  favicon: "img/favicon.svg",

  url: "https://docs.aegiscrypt.bangkah.tech",
  baseUrl: "/",

  organizationName: "Bangkahdev",
  projectName: "AegisCrypt-Web",

  staticDirectories: ["static", "../assets"],

  onBrokenLinks: "throw",

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

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
      image: "screenshots/dashboard.png",
      colorMode: {
        defaultMode: "light",
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "AegisCrypt",
        logo: {
          alt: "Logo AegisCrypt",
          src: "img/logo.svg",
        },
        items: [
          { type: "doc", docId: "ringkasan", position: "left", label: "Dokumentasi" },
          { type: "doc", docId: "mulai-cepat", position: "left", label: "Mulai Cepat" },
          { type: "doc", docId: "referensi-api", position: "left", label: "Referensi" },
          { href: "https://aegiscrypt.bangkah.tech", label: "Buka Aplikasi", position: "right", className: "navbar-app-link" },
          { href: "https://github.com/Bangkahdev/AegisCrypt-Web", label: "GitHub", position: "right" },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Pengantar",
            items: [
              { label: "Ringkasan", to: "/" },
              { label: "Mulai Cepat", to: "/mulai-cepat" },
              { label: "Panduan Pengguna", to: "/panduan-pengguna" },
            ],
          },
          {
            title: "Konsep & Referensi",
            items: [
              { label: "Arsitektur", to: "/arsitektur" },
              { label: "Model Keamanan", to: "/keamanan" },
              { label: "Format .aegis v3", to: "/format-file" },
              { label: "Referensi API Web", to: "/referensi-api" },
            ],
          },
          {
            title: "Operasional",
            items: [
              { label: "Performa & Batasan", to: "/performa" },
              { label: "Deployment", to: "/deployment" },
              { label: "Pemecahan Masalah", to: "/troubleshooting" },
              { label: "FAQ", to: "/faq" },
            ],
          },
          {
            title: "Masukan",
            items: [
              { label: "Isi Form Masukan", href: "https://tally.so/r/Ar2XOk" },
              { label: "Halaman Masukan", href: "https://aegiscrypt.bangkah.tech/awal/masukan/" },
              { label: "Info Program Awal", href: "https://aegiscrypt.bangkah.tech/awal/" },
            ],
          },
          {
            title: "Proyek",
            items: [
              { label: "Aplikasi Web", href: "https://aegiscrypt.bangkah.tech" },
              { label: "Kode Sumber", href: "https://github.com/Bangkahdev/AegisCrypt-Web" },
              { label: "Kebijakan Keamanan", href: "https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md" },
            ],
          },
        ],
        copyright: `Hak cipta (c) ${new Date().getFullYear()} AegisCrypt. Seluruh hak cipta dilindungi.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ["bash", "json", "typescript", "csharp", "powershell"],
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    },
};

module.exports = config;
