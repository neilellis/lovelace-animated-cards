// upstream: README #66 - Water Tank
// Same drawing as the fuel tank (tankCard / tankRows() live in kinds/fuel-tank.js) — upstream
// ships the two cards byte-identical apart from the liquid colour and the icon.

registerKind("water-tank", {
  label: "Animated Water Tank",
  desc: "Tank that fills with blue water, twin counter-scrolling surfaces, red below the low mark",
  domains: ["sensor"],
  schema: tankRows(),
  help: { icon: "Default mdi:water", ...tankHelp() },
  docs: tankDocs(),
  make: (c) => tankCard(c, { icon: "mdi:water", name: "Water Tank", fullRgb: "29, 130, 150" }),
});
