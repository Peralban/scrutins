// Colour scales from the "Scrutins — palettes" design canvas: each group keeps its official colour
// (the step marked `base`) inside an 11-step oklch scale of the same hue, 50 to 950, with even
// perceived lightness. The last four families are the interface's: ink, pour, contre, abstention.
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export const ECHELLES: Record<string, { base: number; steps: string[] }> = {
  "LFI-NFP": { base: 6, steps: ["#FFF3F1", "#FEE4E0", "#FECBC3", "#FEA79A", "#FD7565", "#F72E26", "#C00D0D", "#A60C0B", "#810203", "#5C0303", "#3A0705"] },
  "GDR": { base: 8, steps: ["#FFF4F3", "#FFE4E3", "#FECAC9", "#FDA6A5", "#F8777A", "#DD555C", "#BC3943", "#9C2531", "#830E21", "#541218", "#331011"] },
  "ECOS": { base: 4, steps: ["#EAFDEA", "#D9F4D9", "#C0E5C1", "#A0CFA1", "#77AA79", "#5F9A62", "#457E49", "#326536", "#244D27", "#19351B", "#122113"] },
  "SOC": { base: 3, steps: ["#FFF3F7", "#FFE2ED", "#F9CADC", "#F5B4CE", "#D08EA9", "#B5718E", "#985773", "#7C435C", "#5F3145", "#422230", "#29161E"] },
  "LIOT": { base: 2, steps: ["#FFF6E0", "#FDEAB8", "#FFD96F", "#DFBD60", "#C79F1C", "#A68516", "#876B03", "#6C5507", "#524001", "#392C01", "#251C00"] },
  "EPR": { base: 7, steps: ["#FBF3FF", "#F6E3FF", "#EEC9FF", "#DEA9F5", "#C688E0", "#AB6AC6", "#8E50A8", "#7B4591", "#592B6B", "#3E1E4A", "#26152D"] },
  "DEM": { base: 4, steps: ["#FFF4EE", "#FFE6D7", "#FECEB1", "#FDAB78", "#F07E26", "#D06810", "#A8540F", "#884104", "#683105", "#4A2000", "#321300"] },
  "HOR": { base: 2, steps: ["#EDF9FF", "#D9EFFB", "#B5E2F9", "#A0C8DC", "#7DACC4", "#5F91A9", "#45768D", "#335E73", "#244758", "#19313D", "#121F25"] },
  "DR": { base: 4, steps: ["#F2F7FF", "#DFEDFE", "#C2DCFC", "#A3C4ED", "#8CB0DC", "#648CBC", "#4B719F", "#385A83", "#284465", "#1C2F46", "#131E2B"] },
  "UDR": { base: 6, steps: ["#F2F7FF", "#DFEDFF", "#C0DCFF", "#97C4FE", "#6DA7F1", "#4D8BD8", "#3367A7", "#21589A", "#154277", "#0F2E53", "#0D1D32"] },
  "RN": { base: 8, steps: ["#F5F6FF", "#E6EAFE", "#D0D6FE", "#B4BDF3", "#969FDE", "#7B83C4", "#6168A7", "#4C5289", "#313567", "#272B4A", "#191B2D"] },
  "NI": { base: 5, steps: ["#F4F7FA", "#E8ECEF", "#D5DADE", "#BBC2C8", "#9EA6AC", "#8D949A", "#687076", "#52595F", "#3E4348", "#2B2E32", "#1B1D1F"] },
  "Encre": { base: -1, steps: ["#F8F7F3", "#EDEBE7", "#DCD9D3", "#C4C0B9", "#A8A49C", "#8D8980", "#726E66", "#5B5850", "#45423C", "#302E29", "#1E1D1A"] },
  "Pour": { base: 6, steps: ["#F2F7FF", "#E0ECFF", "#C3DBFF", "#9CC3FE", "#6CA5FD", "#3A85F8", "#1F5FBF", "#0951B5", "#023D8D", "#052A62", "#081C3A"] },
  "Contre": { base: 5, steps: ["#FFF4EF", "#FFE5D8", "#FECDB3", "#FDAA7C", "#F97D28", "#D4640A", "#AE4F00", "#8B3F05", "#6B2E00", "#4C1F01", "#331200"] },
  "Abstention": { base: 5, steps: ["#F7F7F4", "#EBEBE8", "#D9D9D5", "#C1C1BB", "#A5A59E", "#8A8A84", "#6F6F69", "#585853", "#43433E", "#2E2E2B", "#1D1D1B"] },
};
// The source's sigle for the UDR group after its rename.
ECHELLES.UDDPLR = ECHELLES.UDR;

const at = (sigle: string, step: (typeof STEPS)[number]) => ECHELLES[sigle]?.steps[STEPS.indexOf(step)];

// A group label as the canvas draws it: soft (100 ground, 800 text), readable on light surfaces
// whatever the group's own colour. Unknown sigle: undefined, the caller keeps its neutral style.
export function etiquette(sigle: string | null | undefined): { background: string; color: string } | undefined {
  if (!sigle || !ECHELLES[sigle]) return undefined;
  return { background: at(sigle, 100)!, color: at(sigle, 800)! };
}
