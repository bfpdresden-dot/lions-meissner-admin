import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function DatenschutzPage() {
  useEffect(() => {
    const prev = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const prevCanonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    document.title = "Datenschutzerklärung | Lions Club Meißner Land";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Datenschutzerklärung des Lions Club Meißner Land gemäß DSGVO.");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.origin + window.location.pathname);
    return () => {
      document.title = prev;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", prevCanonical);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
          <p className="text-muted-foreground">Lions Club Meißner Land</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
          <p className="text-muted-foreground leading-relaxed">
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <div className="rounded-md border p-4 text-sm space-y-1">
            <p className="font-medium">Lions Club Meißner Land</p>
            <p>Sebastian Schreiber</p>
            <p>Seestraße 18e, 01640 Coswig</p>
            <p>Telefon: 0172 340 85 43</p>
            <p>E-Mail: schreiber1988@gmx.net</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Erhobene Daten und Zweck der Verarbeitung</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir erheben und verarbeiten folgende personenbezogene Daten, wenn Sie sich für unsere
            Veranstaltungen anmelden oder unseren Newsletter abonnieren:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
            <li>Vorname und Nachname</li>
            <li>E-Mail-Adresse</li>
            <li>Telefonnummer (optional)</li>
            <li>Anzahl der Begleitpersonen (bei Veranstaltungsanmeldung)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Die Daten werden ausschließlich für folgende Zwecke verwendet:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
            <li>Organisation und Durchführung von Veranstaltungen des Lions Club Meißner Land</li>
            <li>Zusendung von Einladungen und Informationen zu Clubveranstaltungen</li>
            <li>Verwaltung der Teilnehmerlisten</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Rechtsgrundlage</h2>
          <p className="text-muted-foreground leading-relaxed">
            Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage Ihrer ausdrücklichen
            Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, die Sie durch Ankreuzen der
            Einwilligungserklärung im Anmeldeformular erteilen.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Der
            Widerruf hat keinen Einfluss auf die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Speicherdauer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ihre Daten werden solange gespeichert, wie Sie Mitglied unserer Newsletter-Liste sind
            oder bis Sie die Löschung Ihrer Daten beantragen. Daten zu Veranstaltungsanmeldungen
            werden nach Ablauf von 12 Monaten nach der Veranstaltung gelöscht, sofern keine
            gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Weitergabe an Dritte</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ihre personenbezogenen Daten werden nicht an Dritte weitergegeben. Eine Übermittlung
            ins außereuropäische Ausland findet nicht statt.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Ihre Rechte</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sie haben gemäß DSGVO folgende Rechte:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm ml-2">
            <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie können Auskunft über Ihre gespeicherten Daten verlangen.</li>
            <li><strong>Berichtigungsrecht</strong> (Art. 16 DSGVO): Sie können die Berichtigung unrichtiger Daten verlangen.</li>
            <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Sie können die Löschung Ihrer Daten verlangen.</li>
            <li><strong>Recht auf Einschränkung</strong> (Art. 18 DSGVO): Sie können die Einschränkung der Verarbeitung verlangen.</li>
            <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Sie können der Verarbeitung widersprechen.</li>
            <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Sie können Ihre Daten in einem gängigen Format erhalten.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
            <a href="mailto:schreiber1988@gmx.net" className="underline text-foreground hover:text-primary">
              schreiber1988@gmx.net
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Beschwerderecht</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sie haben das Recht, sich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren.
            Die zuständige Aufsichtsbehörde für Sachsen ist:
          </p>
          <div className="rounded-md border p-4 text-sm space-y-1">
            <p className="font-medium">Sächsischer Datenschutzbeauftragter</p>
            <p>Devrientstraße 5, 01067 Dresden</p>
            <p>Telefon: +49 351 493-5401</p>
            <p>
              <a href="https://www.saechsdsb.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                www.saechsdsb.de
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Widerruf der Einwilligung / Abmeldung</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sie können Ihre Einwilligung jederzeit widerrufen und die Löschung Ihrer Daten
            beantragen. Schreiben Sie dazu eine E-Mail an{" "}
            <a href="mailto:schreiber1988@gmx.net" className="underline text-foreground hover:text-primary">
              schreiber1988@gmx.net
            </a>{" "}
            oder rufen Sie uns unter{" "}
            <a href="tel:01723408543" className="underline text-foreground hover:text-primary">
              0172 340 85 43
            </a>{" "}
            an.
          </p>
        </section>

        <div className="border-t pt-6 text-xs text-muted-foreground">
          Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}
