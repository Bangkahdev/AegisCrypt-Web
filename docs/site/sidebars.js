/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  docs: [
    {
      type: "category",
      label: "Pengantar",
      collapsible: false,
      items: ["ringkasan", "mulai-cepat"],
    },
    {
      type: "category",
      label: "Panduan Pengguna",
      collapsible: true,
      collapsed: false,
      items: ["panduan-pengguna", "tangkapan-layar"],
    },
    {
      type: "category",
      label: "Konsep",
      collapsible: true,
      collapsed: false,
      items: ["arsitektur", "keamanan"],
    },
    {
      type: "category",
      label: "Referensi Teknis",
      collapsible: true,
      collapsed: false,
      items: ["format-file", "referensi-api"],
    },
    {
      type: "category",
      label: "Operasional",
      collapsible: true,
      collapsed: false,
      items: ["performa", "deployment", "troubleshooting", "faq"],
    },
  ],
};
