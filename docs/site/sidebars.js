/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
module.exports = {
  docs: [
    {
      type: "category",
      label: "Introduction",
      collapsible: false,
      items: ["ringkasan", "mulai-cepat"],
    },
    {
      type: "category",
      label: "User Guide",
      collapsible: true,
      collapsed: false,
      items: ["panduan-pengguna", "tangkapan-layar"],
    },
    {
      type: "category",
      label: "Concepts",
      collapsible: true,
      collapsed: false,
      items: ["arsitektur", "keamanan"],
    },
    {
      type: "category",
      label: "Technical Reference",
      collapsible: true,
      collapsed: false,
      items: ["format-file", "referensi-api"],
    },
    {
      type: "category",
      label: "Operations",
      collapsible: true,
      collapsed: false,
      items: ["performa", "deployment", "troubleshooting", "faq"],
    },
  ],
};
