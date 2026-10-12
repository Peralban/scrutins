import s from "./Notions.module.css";

export default function NotionBanner() {
  return (
    <p className={s.banner}>
      <b>Étiquettes en cours de validation.</b> Le sens de chaque amendement a été établi à la main à partir de son texte, mais n&apos;a pas encore été relu ni validé.
      Voter contre un amendement n&apos;est pas toujours voter contre la notion : un amendement peut aussi fixer un chiffre, une date ou une procédure que le député refuse.
      Chaque étiquette est listée avec sa justification pour être contestée.
    </p>
  );
}
