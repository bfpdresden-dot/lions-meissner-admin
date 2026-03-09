import { storage } from "./storage";

export async function seedDatabase() {
  const existingEvents = await storage.getEvents();
  if (existingEvents.length > 0) return;

  const events = [
    {
      title: "Fr\u00fchlingsfest 2026",
      description: "Unser traditionelles Fr\u00fchlingsfest mit Tombola, Live-Musik und regionalen Spezialit\u00e4ten. Der Erl\u00f6s kommt sozialen Projekten in der Region zugute.",
      date: new Date("2026-04-18T14:00:00"),
      location: "Vereinshaus Mei\u00dfen",
      maxParticipants: 150,
      isActive: true,
    },
    {
      title: "Benefiz-Golfturnier",
      description: "Charity-Golfturnier zugunsten des Kinderhospiz. Anmeldung f\u00fcr Einzelspieler und Teams m\u00f6glich. Inklusive Abendessen und Preisverleihung.",
      date: new Date("2026-05-23T09:00:00"),
      location: "Golfclub Elbland",
      maxParticipants: 80,
      isActive: true,
    },
    {
      title: "Sommerfest am Elbufer",
      description: "Gem\u00fctliches Sommerfest mit Grillabend, Kinderprogramm und Tombola am Elbufer. Alle B\u00fcrger sind herzlich willkommen.",
      date: new Date("2026-07-11T16:00:00"),
      location: "Elbwiesen Mei\u00dfen",
      maxParticipants: 200,
      isActive: true,
    },
    {
      title: "Weihnachtsmarkt-Stand",
      description: "Unser Lions Club Stand auf dem Mei\u00dfner Weihnachtsmarkt. Gl\u00fchwein, Bratwurst und handgemachte Geschenke zugunsten der Lions-Projekte.",
      date: new Date("2026-12-05T15:00:00"),
      location: "Marktplatz Mei\u00dfen",
      maxParticipants: null,
      isActive: true,
    },
  ];

  for (const event of events) {
    await storage.createEvent(event);
  }

  const subs = [
    { email: "hans.mueller@beispiel.de", firstName: "Hans", lastName: "M\u00fcller", isActive: true, eventId: 1 },
    { email: "petra.schmidt@beispiel.de", firstName: "Petra", lastName: "Schmidt", isActive: true, eventId: 1 },
    { email: "thomas.wagner@beispiel.de", firstName: "Thomas", lastName: "Wagner", isActive: true, eventId: 2 },
    { email: "sabine.fischer@beispiel.de", firstName: "Sabine", lastName: "Fischer", isActive: false, eventId: 3 },
    { email: "klaus.becker@beispiel.de", firstName: "Klaus", lastName: "Becker", isActive: true, eventId: 2 },
  ];

  for (const sub of subs) {
    await storage.createSubscriber(sub);
  }

  console.log("Database seeded with sample data");
}
