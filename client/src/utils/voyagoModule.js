/** Voyago platform: map booking item types to product modules. */
export function voyagoModuleFromItemType(itemType) {
  if (itemType === "property") return "Stayora";
  return "Tripora";
}

export function voyagoModuleSlugFromItemType(itemType) {
  return itemType === "property" ? "stayora" : "tripora";
}
