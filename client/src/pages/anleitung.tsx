import { useState } from "react";
import { useSearch } from "wouter";
import { ChevronDown, ChevronUp, Printer, Globe, User, ShieldCheck, CheckCircle2, Mail, CalendarDays, QrCode, Users, BarChart2, Calculator, Settings, LogIn, Star, Phone, ClipboardList } from "lucide-react";

const NAVY = "#1a3a5c";
const GOLD = "#c8a84b";

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: NAVY }}>{n}</div>
      <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{text}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      💡 <strong>Tipp:</strong> {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      ℹ️ {children}
    </div>
  );
}

function Screenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-4">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-xl border border-gray-200 shadow-md"
        loading="lazy"
      />
      {caption && <figcaption className="text-xs text-gray-500 mt-2 text-center italic">{caption}</figcaption>}
    </figure>
  );
}

function Section({ id, icon, title, color, children, defaultOpen = false }: {
  id: string; icon: React.ReactNode; title: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="rounded-2xl border shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors"
        style={{ background: open ? NAVY : "#f8fafc" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
          <span className="text-white">{icon}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: open ? "white" : NAVY }}>{title}</h2>
        </div>
        <span style={{ color: open ? "white" : NAVY }}>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>
      {open && <div className="p-5 bg-white space-y-6">{children}</div>}
    </div>
  );
}

function SubSection({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: GOLD }}>
        {icon && <span style={{ color: NAVY }}>{icon}</span>}
        <h3 className="font-bold text-base" style={{ color: NAVY }}>{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function AnleitungPage() {
  const search = useSearch();
  const bereich = new URLSearchParams(search).get("bereich");

  const title = bereich === "oeffentlich" ? "Anleitung: Öffentliche Seite"
    : bereich === "portal" ? "Anleitung: Mein Bereich"
    : bereich === "admin" ? "Anleitung: Admin-Bereich"
    : "Bedienungsanleitung";

  const backLabel = bereich === "portal" ? "← Zurück zu Mein Bereich"
    : bereich === "admin" ? "← Zurück zum Admin-Bereich"
    : "← Zurück zur Startseite";

  const backHref = bereich === "portal" ? "/mein-bereich"
    : bereich === "admin" ? "/admin"
    : "/";

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="text-white py-10 px-4 text-center" style={{ background: NAVY }}>
        <img src="/images/lions-logo.png" alt="Lions Club Logo" className="h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-blue-200 text-sm">Lions Club Meißner Land · Admin-Tool</p>
        {!bereich && (
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="#oeffentlich" className="px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors">🌐 Öffentliche Seite</a>
            <a href="#portal" className="px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors">👤 Mein Bereich</a>
            <a href="#admin" className="px-4 py-2 rounded-full text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors">🛡️ Admin-Bereich</a>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Intro — nur wenn alle Bereiche sichtbar */}
        {!bereich && (
          <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              Diese Anleitung erklärt alle drei Bereiche des Lions Club Tools Schritt für Schritt.
              Tippen Sie auf einen Bereich um ihn aufzuklappen.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-green-500" /> Für alle Besucher
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-blue-500" /> Nur für Mitglieder
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-purple-500" /> Nur für Admins
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            BEREICH 1: ÖFFENTLICHE SEITE
        ══════════════════════════════════════════ */}
        {(!bereich || bereich === "oeffentlich") && <Section id="oeffentlich" icon={<Globe className="h-5 w-5" />} title="1. Öffentliche Seite — Für alle Besucher" color="#16a34a" defaultOpen={true}>

          <SubSection icon={<CalendarDays className="h-4 w-4" />} title="Die Startseite aufrufen">
            <p className="text-sm text-gray-600">
              Öffnen Sie einen Browser (z.&nbsp;B. Safari, Chrome) und geben Sie die Adresse des Lions Clubs ein. Sie sehen sofort alle aktuellen Veranstaltungen.
            </p>
            <Screenshot src="/screenshots/01-public-home.jpg" alt="Startseite mit Veranstaltungen" caption="Die Startseite zeigt alle aktiven Veranstaltungen" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Was Sie auf der Startseite sehen:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside pl-2">
                <li>Das Lions-Logo und den Clubnamen oben</li>
                <li>Alle kommenden Veranstaltungen als Karten</li>
                <li>Datum, Uhrzeit und Ort jeder Veranstaltung</li>
                <li>Wie viele Plätze noch frei sind</li>
                <li>Buttons zum Anmelden und für Details</li>
              </ul>
            </div>
            <Tip>Auf dem Handy scrollen Sie einfach nach unten um alle Veranstaltungen zu sehen.</Tip>
          </SubSection>

          <SubSection icon={<CheckCircle2 className="h-4 w-4" />} title="Für eine Veranstaltung anmelden">
            <p className="text-sm text-gray-600">
              Sie können sich direkt auf der Startseite für eine Veranstaltung anmelden — ganz ohne Konto.
            </p>
            <div className="space-y-2">
              <Step n={1} text='Tippen (oder klicken) Sie auf den blauen Button „Anmelden" bei der gewünschten Veranstaltung.' />
              <Step n={2} text="Ein Formular erscheint. Tragen Sie Ihren Vornamen, Nachnamen und Ihre E-Mail-Adresse ein." />
              <Step n={3} text="Optional: Geben Sie an wie viele Personen mitkommen (Gäste)." />
              <Step n={4} text='Tippen Sie auf „Anmeldung bestätigen". Sie erhalten eine Bestätigungs-E-Mail.' />
            </div>
            <Hint>Die Anmeldung ist kostenlos und unverbindlich. Sie können sich jederzeit abmelden.</Hint>
          </SubSection>

          <SubSection icon={<Mail className="h-4 w-4" />} title="Newsletter abonnieren">
            <p className="text-sm text-gray-600">
              Als Newsletter-Abonnent erhalten Sie Einladungen zu allen künftigen Veranstaltungen direkt per E-Mail.
            </p>
            <p className="text-sm font-medium text-gray-700 mt-2">Möglichkeit 1: Über die Startseite</p>
            <div className="space-y-2">
              <Step n={1} text='Tippen Sie oben auf den Button „Newsletter abonnieren" oder auf den schwimmenden E-Mail-Button unten rechts.' />
              <Step n={2} text="Füllen Sie das Formular mit Ihrem Namen und Ihrer E-Mail-Adresse aus." />
              <Step n={3} text='Setzen Sie den Haken bei der Datenschutzerklärung und tippen Sie auf „Newsletter abonnieren".' />
              <Step n={4} text="Sie erhalten eine E-Mail mit einem Bestätigungslink — bitte darauf klicken!" />
            </div>
            <p className="text-sm font-medium text-gray-700 mt-3">Möglichkeit 2: Per QR-Code (z. B. am Veranstaltungsstand)</p>
            <div className="space-y-2">
              <Step n={1} text="Scannen Sie den QR-Code mit der Kamera-App Ihres Handys." />
              <Step n={2} text="Eine Seite öffnet sich automatisch im Browser." />
              <Step n={3} text="Füllen Sie das Formular aus und bestätigen Sie." />
            </div>
            <Screenshot src="/screenshots/02-subscribe.jpg" alt="Newsletter-Anmeldeformular" caption="Das Anmeldeformular nach dem QR-Code-Scan" />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">📬 Bestätigungs-E-Mail nicht angekommen?</p>
              <p>Prüfen Sie Ihren <strong>Spam- oder Junk-Ordner</strong>.</p>
              <p>💡 Fügen Sie den Absender als <strong>VIP / Kontakt</strong> hinzu — dann kommen unsere E-Mails künftig direkt in Ihren Posteingang.</p>
            </div>
          </SubSection>

          <SubSection icon={<Star className="h-4 w-4" />} title="Veranstaltungsdetails ansehen">
            <div className="space-y-2">
              <Step n={1} text='Tippen Sie bei einer Veranstaltung auf den Button „Details".' />
              <Step n={2} text="Ein Fenster öffnet sich mit der vollständigen Beschreibung, Datum, Uhrzeit und Ort." />
              <Step n={3} text="Über den Teilen-Button können Sie die Veranstaltung mit anderen teilen." />
            </div>
          </SubSection>

        </Section>}

        {/* ══════════════════════════════════════════
            BEREICH 2: MEIN BEREICH
        ══════════════════════════════════════════ */}
        {(!bereich || bereich === "portal") && <Section id="portal" icon={<User className="h-5 w-5" />} title="2. Mein Bereich — Für Mitglieder" color="#2563eb" defaultOpen={true}>

          <Hint>
            <strong>Mein Bereich</strong> ist nur für Newsletter-Abonnenten und Clubmitglieder die bei der Anmeldung ein Passwort vergeben haben.
          </Hint>

          <SubSection icon={<LogIn className="h-4 w-4" />} title="Anmelden in Mein Bereich">
            <Screenshot src="/screenshots/03-portal-login.jpg" alt="Anmeldeseite Mein Bereich" caption="Die Anmeldeseite für Mitglieder" />
            <div className="space-y-2">
              <Step n={1} text='Tippen Sie auf der Startseite oben auf „Mein Bereich".' />
              <Step n={2} text="Geben Sie Ihre E-Mail-Adresse ein — dieselbe die Sie beim Newsletter angegeben haben." />
              <Step n={3} text="Geben Sie Ihr Passwort ein." />
              <Step n={4} text='Tippen Sie auf „Anmelden".' />
            </div>
            <Tip>Noch kein Passwort? Klicken Sie auf „Noch kein Konto? Melden Sie sich für den Newsletter an" — Sie können beim Anmelden sofort ein Passwort vergeben.</Tip>
          </SubSection>

          <SubSection icon={<Phone className="h-4 w-4" />} title="Passwort vergessen">
            <div className="space-y-2">
              <Step n={1} text='Tippen Sie auf der Anmeldeseite auf „Passwort vergessen?".' />
              <Step n={2} text="Geben Sie Ihre E-Mail-Adresse ein und bestätigen Sie." />
              <Step n={3} text="Sie erhalten eine E-Mail mit einem Link zum Zurücksetzen des Passworts. Der Link ist 1 Stunde gültig." />
              <Step n={4} text="Tippen Sie auf den Link in der E-Mail und vergeben Sie ein neues Passwort." />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              📬 Prüfen Sie auch Ihren <strong>Spam-Ordner</strong>, falls die E-Mail nicht ankommt.
            </div>
          </SubSection>

          <SubSection icon={<CalendarDays className="h-4 w-4" />} title="Eigene Anmeldungen ansehen">
            <p className="text-sm text-gray-600">Nach dem Anmelden sehen Sie in Mein Bereich alle Veranstaltungen für die Sie angemeldet sind.</p>
            <div className="space-y-2">
              <Step n={1} text="Scrollen Sie auf der Seite nach unten — Sie sehen alle Ihre aktuellen Anmeldungen." />
              <Step n={2} text="Bei jeder Anmeldung stehen Datum, Uhrzeit und Ort der Veranstaltung." />
              <Step n={3} text='Wenn Sie eine Anmeldung stornieren möchten, tippen Sie auf „Abmelden" bei der entsprechenden Veranstaltung.' />
            </div>
          </SubSection>

          <SubSection icon={<ClipboardList className="h-4 w-4" />} title="Schichtplan ansehen">
            <p className="text-sm text-gray-600">Wenn Sie für einen Dienst beim Lions Club eingeteilt sind, können Sie Ihren Schichtplan hier einsehen.</p>
            <div className="space-y-2">
              <Step n={1} text="Tippen Sie im Mein Bereich auf den Reiter oder den Link zum Schichtplan." />
              <Step n={2} text="Sie sehen alle Ihre eingetragenen Schichten mit Uhrzeit und Aufgabe." />
            </div>
          </SubSection>

          <SubSection icon={<Mail className="h-4 w-4" />} title="Newsletter abbestellen">
            <div className="space-y-2">
              <Step n={1} text='Scrollen Sie in Mein Bereich ganz nach unten und tippen Sie auf „Newsletter abbestellen".' />
              <Step n={2} text="Bestätigen Sie die Abmeldung." />
            </div>
            <Hint>Sie können den Newsletter auch über den Abmelde-Link in jeder Newslettermail abbestellen — ohne sich einloggen zu müssen.</Hint>
          </SubSection>

        </Section>}

        {/* ══════════════════════════════════════════
            BEREICH 3: ADMIN
        ══════════════════════════════════════════ */}
        {(!bereich || bereich === "admin") && <Section id="admin" icon={<ShieldCheck className="h-5 w-5" />} title="3. Admin-Bereich — Für Administratoren" color="#7c3aed" defaultOpen={true}>

          <Hint>
            Der Admin-Bereich ist passwortgeschützt und nur für berechtigte Personen zugänglich. Die Adresse lautet: <strong>/admin</strong>
          </Hint>

          <SubSection icon={<LogIn className="h-4 w-4" />} title="Anmelden als Administrator">
            <Screenshot src="/screenshots/04-admin-login.jpg" alt="Admin-Anmeldeseite" caption="Die Admin-Anmeldeseite" />
            <div className="space-y-2">
              <Step n={1} text="Öffnen Sie die Adresse der App und fügen Sie /admin am Ende der URL hinzu." />
              <Step n={2} text="Geben Sie Ihre Administrator-E-Mail-Adresse und Ihr Passwort ein." />
              <Step n={3} text='Klicken Sie auf „Anmelden".' />
            </div>
            <Tip>Am besten am Computer (Desktop/Laptop) arbeiten — der Admin-Bereich ist für größere Bildschirme optimiert.</Tip>
          </SubSection>

          <SubSection icon={<BarChart2 className="h-4 w-4" />} title="Dashboard — Die Übersicht">
            <p className="text-sm text-gray-600">
              Nach dem Anmelden landen Sie auf dem Dashboard. Hier sehen Sie auf einen Blick die wichtigsten Zahlen.
            </p>
            <div className="grid grid-cols-2 gap-2 my-3">
              {[
                { label: "Veranstaltungen", desc: "Wie viele aktive Events gibt es" },
                { label: "Mitglieder", desc: "Gesamtzahl der Clubmitglieder" },
                { label: "Abonnenten", desc: "Newsletter-Empfänger" },
                { label: "Anmeldungen", desc: "Gäste bei Veranstaltungen" },
              ].map(c => (
                <div key={c.label} className="rounded-lg border p-3 bg-gray-50">
                  <p className="text-xs font-bold" style={{ color: NAVY }}>{c.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">Die Navigation befindet sich in der linken Seitenleiste — klicken Sie auf einen Menüpunkt um dorthin zu wechseln.</p>
          </SubSection>

          <SubSection icon={<CalendarDays className="h-4 w-4" />} title="Veranstaltungen verwalten">
            <p className="text-sm text-gray-600">Unter <strong>Veranstaltungen</strong> in der linken Seitenleiste verwalten Sie alle Events.</p>
            <p className="text-sm font-medium text-gray-700 mt-2">Neue Veranstaltung erstellen:</p>
            <div className="space-y-2">
              <Step n={1} text='Klicken Sie rechts oben auf „Neue Veranstaltung".' />
              <Step n={2} text="Füllen Sie den Titel, Beschreibung, Datum, Uhrzeit, Ort und maximale Teilnehmerzahl aus." />
              <Step n={3} text='Klicken Sie auf „Speichern". Die Veranstaltung erscheint sofort auf der öffentlichen Seite.' />
            </div>
            <p className="text-sm font-medium text-gray-700 mt-3">Veranstaltung bearbeiten oder löschen:</p>
            <div className="space-y-2">
              <Step n={1} text="Klicken Sie in der Liste auf das Stift-Symbol (✏️) zum Bearbeiten oder das Papierkorb-Symbol (🗑️) zum Löschen." />
              <Step n={2} text="Beim Bearbeiten können Sie alle Felder ändern und dann speichern." />
            </div>
            <p className="text-sm font-medium text-gray-700 mt-3">Gästeliste ansehen und exportieren:</p>
            <div className="space-y-2">
              <Step n={1} text='Klicken Sie bei einer Veranstaltung auf „Gästeliste".' />
              <Step n={2} text='Alle angemeldeten Gäste erscheinen. Mit „CSV exportieren" können Sie die Liste als Excel-Datei herunterladen.' />
            </div>
            <Tip>Stellen Sie eine Veranstaltung auf „Inaktiv" wenn sie abgesagt wurde — sie verschwindet dann von der öffentlichen Seite, bleibt aber in Ihrer Verwaltung erhalten.</Tip>
          </SubSection>

          <SubSection icon={<ClipboardList className="h-4 w-4" />} title="Schichtplan verwalten">
            <p className="text-sm text-gray-600">Unter <strong>Schichtplan</strong> verwalten Sie die Diensteinteilungen für jede Veranstaltung.</p>
            <div className="space-y-2">
              <Step n={1} text="Wählen Sie oben die Veranstaltung aus der Liste aus." />
              <Step n={2} text='Klicken Sie auf „Neue Schicht" um eine Aufgabe (z. B. „Kassenstand", „Aufbau") mit Uhrzeit anzulegen.' />
              <Step n={3} text="Weisen Sie Mitglieder den Schichten zu indem Sie auf das +-Symbol klicken." />
              <Step n={4} text="Mitglieder können ihren Schichtplan unter Mein Bereich einsehen." />
            </div>
          </SubSection>

          <SubSection icon={<Calculator className="h-4 w-4" />} title="Kalkulation — Einnahmen & Ausgaben">
            <p className="text-sm text-gray-600">Unter <strong>Kalkulation</strong> erfassen Sie die finanziellen Ergebnisse einer Veranstaltung.</p>
            <div className="space-y-2">
              <Step n={1} text="Wählen Sie oben die Veranstaltung aus." />
              <Step n={2} text='Klicken Sie auf das „+"-Symbol bei Einnahmen oder Ausgaben und tragen Sie Beschreibung und Betrag ein.' />
              <Step n={3} text="Der Ertrag (Einnahmen minus Ausgaben) wird automatisch berechnet und unten angezeigt." />
            </div>
            <p className="text-sm font-medium text-gray-700 mt-3">PDF erstellen:</p>
            <div className="space-y-2">
              <Step n={1} text='Klicken Sie auf „Gewinnrechnung (PDF)" für eine einfache Zusammenfassung.' />
              <Step n={2} text='Klicken Sie auf „Mit Mitgliederabrechnung (PDF)" um zusätzlich den Anteil je Mitglied zu berechnen und in der Statistik zu speichern.' />
              <Step n={3} text='Ein neues Fenster öffnet sich — klicken Sie dort auf „Drucken" oder „Als PDF speichern".' />
            </div>
            <Tip>Das erweiterte PDF speichert den Ertrag automatisch in der Statistik. Danach können Sie unter Statistik die Hitliste aller Mitglieder abrufen.</Tip>
          </SubSection>

          <SubSection icon={<BarChart2 className="h-4 w-4" />} title="Statistik — Mitglieder-Ertragsübersicht">
            <p className="text-sm text-gray-600">Unter <strong>Statistik</strong> sehen Sie eine Hitliste aller Mitglieder sortiert nach ihrem Gesamtertrag aus allen Veranstaltungen.</p>
            <div className="space-y-2">
              <Step n={1} text="Die Hitliste wird automatisch nach dem ersten erweiterten PDF in der Kalkulation befüllt." />
              <Step n={2} text="Klicken Sie auf einen Mitgliedseintrag um die Details (welche Veranstaltungen, welche Beträge) aufzuklappen." />
              <Step n={3} text='Mit „Statistik als PDF" können Sie die gesamte Hitliste drucken oder speichern.' />
            </div>
            <Hint>Mitglieder mit gleichem Gesamtbetrag bekommen automatisch die gleiche Medaille (🥇🥈🥉) und sind alphabetisch sortiert.</Hint>
          </SubSection>

          <SubSection icon={<Users className="h-4 w-4" />} title="Mitglieder verwalten">
            <p className="text-sm text-gray-600">Unter <strong>Mitglieder</strong> verwalten Sie alle Clubmitglieder.</p>
            <div className="space-y-2">
              <Step n={1} text='Klicken Sie auf „Neues Mitglied" um ein Mitglied hinzuzufügen.' />
              <Step n={2} text="Füllen Sie Vor- und Nachname, E-Mail und optional Telefonnummer aus." />
              <Step n={3} text="Über das Stift-Symbol können Sie Daten ändern, über das Papierkorb-Symbol löschen." />
              <Step n={4} text='Mit „CSV exportieren" laden Sie die gesamte Mitgliederliste als Excel-Datei herunter.' />
            </div>
            <Tip>Mitglieder bekommen automatisch Zugang zu Mein Bereich sobald ihnen ein Passwort zugewiesen wurde.</Tip>
          </SubSection>

          <SubSection icon={<Mail className="h-4 w-4" />} title="Abonnenten verwalten">
            <p className="text-sm text-gray-600">Unter <strong>Abonnenten</strong> sehen Sie alle Newsletter-Empfänger.</p>
            <div className="space-y-2">
              <Step n={1} text="Die Liste zeigt alle angemeldeten Abonnenten mit Datum der Anmeldung." />
              <Step n={2} text="Über das E-Mail-Symbol können Sie direkt eine E-Mail an einen Abonnenten schicken." />
              <Step n={3} text='Mit „CSV exportieren" laden Sie die Abonnentenliste als Excel-Datei herunter.' />
              <Step n={4} text="Inaktive Abonnenten (haben den Newsletter abbestellt) sind grau markiert." />
            </div>
          </SubSection>

          <SubSection icon={<QrCode className="h-4 w-4" />} title="QR-Codes generieren">
            <p className="text-sm text-gray-600">Unter <strong>QR-Codes</strong> erstellen Sie QR-Codes für die Newsletter-Anmeldung bei Veranstaltungen.</p>
            <div className="space-y-2">
              <Step n={1} text="Wählen Sie aus der Liste die gewünschte Veranstaltung." />
              <Step n={2} text='Ein QR-Code wird automatisch erzeugt. Klicken Sie auf „Drucken" um ihn auszudrucken.' />
              <Step n={3} text='Mit „Herunterladen" speichern Sie den QR-Code als Bilddatei um ihn z. B. in einem Flyer zu verwenden.' />
            </div>
            <Tip>Stellen Sie den QR-Code gut sichtbar an Ihrem Veranstaltungsstand auf — Besucher können sich damit direkt für den Newsletter anmelden.</Tip>
          </SubSection>

          <SubSection icon={<Settings className="h-4 w-4" />} title="Einstellungen">
            <p className="text-sm text-gray-600">Unter <strong>Einstellungen</strong> konfigurieren Sie grundlegende Systemdaten.</p>
            <div className="space-y-2">
              <Step n={1} text="Clubname und Kontaktdaten: Diese erscheinen im Footer der öffentlichen Seite." />
              <Step n={2} text="E-Mail-Einstellungen: Die Absenderadresse für Bestätigungs-E-Mails." />
              <Step n={3} text={'Passwort ändern: Klicken Sie auf "Passwort ändern" um Ihr Admin-Passwort zu aktualisieren.'} />
            </div>
            <Hint>Änderungen in den Einstellungen sind sofort wirksam — Sie müssen nicht neu starten.</Hint>
          </SubSection>

        </Section>}

        {/* Footer */}
        <div className="text-center py-6 space-y-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
            style={{ background: NAVY }}
          >
            <Printer className="h-4 w-4" />
            Anleitung drucken / als PDF speichern
          </button>
          <p className="text-xs text-gray-400">Lions Club Meißner Land · Bedienungsanleitung · Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</p>
          <a href={backHref} className="block text-xs text-blue-600 underline">{backLabel}</a>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          button { display: none !important; }
          a[href="/"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
