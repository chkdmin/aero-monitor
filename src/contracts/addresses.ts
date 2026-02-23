export const ADDRESSES = {
  // NonfungiblePositionManager (v1 - Slipstream Position NFT v1)
  NPM_V1: "0x827922686190790b37229fd06084350E74485b72" as const,
  // NonfungiblePositionManager (Gauge Caps)
  NPM_GAUGE_CAPS: "0xa990C6a764b73BF43cee5Bb40339c3322FB9D55F" as const,

  // CL Pool Factory (initial)
  CL_FACTORY_V1: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A" as const,
  // CL Pool Factory (gauge caps)
  CL_FACTORY_GAUGE_CAPS: "0xaDe65c38CD4849aDBA595a4323a8C7DdfE89716a" as const,
} as const;

// NPM addresses to check (both versions)
export const NPM_ADDRESSES = [ADDRESSES.NPM_V1, ADDRESSES.NPM_GAUGE_CAPS] as const;

// Factory address paired with each NPM
export const NPM_FACTORY_PAIRS = [
  { npm: ADDRESSES.NPM_V1, factory: ADDRESSES.CL_FACTORY_V1 },
  { npm: ADDRESSES.NPM_GAUGE_CAPS, factory: ADDRESSES.CL_FACTORY_GAUGE_CAPS },
] as const;
