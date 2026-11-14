// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const { themes } = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "AegisCrypt Docs",
  tagline: "Official documentation for local, browser-based file encryption with AegisCrypt",
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
    defaultLocale: "en",
    locales: ["en", "id"],
    localeConfigs: {
      en: { label: "English", htmlLang: "en" },
      id: { label: "Bahasa Indonesia", htmlLang: "id" },
    },
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
          alt: "AegisCrypt logo",
          src: "img/logo.svg",
        },
        items: [
          { type: "doc", docId: "ringkasan", position: "left", label: "Documentation" },
          { type: "doc", docId: "mulai-cepat", position: "left", label: "Quick Start" },
          { type: "doc", docId: "referensi-api", position: "left", label: "Reference" },
          { href: "https://aegiscrypt.bangkah.tech", label: "Open App", position: "right", className: "navbar-app-link" },
          { href: "https://github.com/Bangkahdev/AegisCrypt-Web", label: "GitHub", position: "right" },
          { type: "localeDropdown", position: "right" },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Introduction",
            items: [
              { label: "Overview", to: "/" },
              { label: "Quick Start", to: "/mulai-cepat" },
              { label: "User Guide", to: "/panduan-pengguna" },
            ],
          },
          {
            title: "Concepts & Reference",
            items: [
              { label: "Architecture", to: "/arsitektur" },
              { label: "Security Model", to: "/keamanan" },
              { label: ".aegis v3 Format", to: "/format-file" },
              { label: "Web API Reference", to: "/referensi-api" },
            ],
          },
          {
            title: "Operations",
            items: [
              { label: "Performance & Limits", to: "/performa" },
              { label: "Deployment", to: "/deployment" },
              { label: "Troubleshooting", to: "/troubleshooting" },
              { label: "FAQ", to: "/faq" },
            ],
          },
          {
            title: "Feedback",
            items: [
              { label: "Feedback Form", href: "https://tally.so/r/Ar2XOk" },
              { label: "Feedback Page", href: "https://aegiscrypt.bangkah.tech/awal/masukan/" },
              { label: "Early Program Info", href: "https://aegiscrypt.bangkah.tech/awal/" },
            ],
          },
          {
            title: "Project",
            items: [
              { label: "Web App", href: "https://aegiscrypt.bangkah.tech" },
              { label: "Source Code", href: "https://github.com/Bangkahdev/AegisCrypt-Web" },
              { label: "Security Policy", href: "https://github.com/Bangkahdev/AegisCrypt-Web/blob/main/SECURITY.md" },
            ],
          },
        ],
        copyright: `Copyright (c) ${new Date().getFullYear()} AegisCrypt. All rights reserved.`,
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
