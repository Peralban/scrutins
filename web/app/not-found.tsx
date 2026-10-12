import Link from "next/link";

export default function NotFound() {
  return (
    <section>
      <h2>Introuvable</h2>
      <p className="def">Cette page ou ce député n&apos;existe pas. <Link href="/depute">Rechercher un député</Link> ou <Link href="/">revenir aux statistiques</Link>.</p>
    </section>
  );
}
