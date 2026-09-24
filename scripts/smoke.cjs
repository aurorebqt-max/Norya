// Optional browser verification. Requires Playwright externally; see docs/validation.md.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const server = http
  .createServer((req, res) => {
    let name = path.join(
      path.join(process.cwd(), "dist"),
      decodeURIComponent(req.url.split("?")[0]),
    );
    if (fs.existsSync(name) && fs.statSync(name).isDirectory())
      name = path.join(name, "index.html");
    if (!fs.existsSync(name)) name += ".html";
    if (!fs.existsSync(name))
      name = path.join(process.cwd(), "dist/index.html");
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".ttf": "font/ttf",
      ".png": "image/png",
    };
    res.setHeader(
      "Content-Type",
      types[path.extname(name)] || "application/octet-stream",
    );
    res.end(fs.readFileSync(name));
  })
  .listen(8082, "127.0.0.1");
const { chromium } = require(
  process.env.NORYA_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const os = require("node:os");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "norya-mission2-"));
const base = "http://localhost:8082";
let context;
(async () => {
  const errors = [];
  const launch = async () => {
    context = await chromium.launchPersistentContext(directory, {
      headless: true,
      args: ["--no-sandbox"],
      viewport: { width: 390, height: 844 },
      timezoneId: "Europe/Paris",
    });
    const page = context.pages()[0];
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  };
  let page = await launch();
  const button = (label) =>
    page.getByRole("button", { name: label, exact: true }).last();
  const snapshot = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("norya.preparation")));
  await page.goto(base);
  await button("Personnaliser mon parcours").click();
  await button("Continuer").click();
  await page.getByLabel("Prénom", { exact: true }).fill("Aurore");
  await button("Continuer").click(); // exam
  await button("Continuer").click(); // dates
  await button("2028").click();
  await page
    .getByLabel("Date provisoire du concours", { exact: true })
    .fill("2028-10-12");
  await button("Continuer").click(); // specialties
  await button("Ophtalmologie").click();
  await button("Dermatologie").click();
  await button("Continuer").click(); // availability
  await page.getByLabel("Minutes Lun", { exact: true }).fill("90");
  await button("Continuer").click(); // goal
  await button("Continuer").click(); // preview
  await button("Créer mon calendrier").click();
  await page.getByText("Bonjour Aurore,", { exact: true }).waitFor();
  let saved = await snapshot();
  assert.equal(saved.profile.year, "2028");
  assert.equal(saved.profile.examDate.provisional, "2028-10-12");
  assert.deepEqual(saved.profile.specialties, [
    "Ophtalmologie",
    "Dermatologie",
  ]);
  assert.equal(saved.profile.weeklyMinutes[0], 90);
  console.log("Onboarding et calendrier personnalisé : OK");
  await button("Commencer ma séance").click();
  await page.getByLabel("Minutes travaillées", { exact: true }).fill("15");
  await button("Enregistrer une séance partielle").click();
  await page
    .getByText("Avancement enregistré. Le reste est replanifié.", {
      exact: true,
    })
    .waitFor();
  saved = await snapshot();
  assert.equal(saved.progress["cardio-1"].initialMinutes, 15);
  assert.equal(saved.progress["cardio-1"].initialCompletedOn, undefined);
  await page.getByLabel("Minutes travaillées", { exact: true }).fill("30");
  await button("Valider ce passage terminé").click();
  await page
    .getByText(
      "Séance validée. Votre calendrier et votre progression sont actualisés.",
      { exact: true },
    )
    .waitFor();
  await button("Retour à mon programme").click();
  await page
    .getByText("1 objectifs parcourus sur 18", { exact: true })
    .waitFor();
  console.log("Séance partielle puis terminée, accueil synchronisé : OK");
  for (const tab of [
    "Calendrier",
    "Bibliothèque",
    "Entraînement",
    "Coach Norya",
    "Accueil",
  ]) {
    await page.getByRole("tab").filter({ hasText: tab }).click();
  }
  await page.goto(base + "/profile");
  await button("Disponibilités et dates").click();
  await page.getByLabel("Minutes Lun", { exact: true }).fill("15");
  await button("Enregistrer et recalculer").click();
  await button("Disponibilités et dates").waitFor();
  saved = await snapshot();
  assert.equal(saved.profile.weeklyMinutes[0], 15);
  assert.equal(saved.progress["cardio-1"].initialMinutes, 45);
  // Reopen real Chromium persistent profile, not only a page reload.
  await context.close();
  page = await launch();
  await page.goto(base);
  await page.getByText("Bonjour Aurore,", { exact: true }).waitFor();
  let reopened = await snapshot();
  assert.deepEqual(reopened, saved);
  console.log(
    "Fermeture et réouverture du navigateur, données conservées : OK",
  );
  for (const id of ["dermato-1", "ophta-1", "neuro-1", "pneumo-1"]) {
    await page.goto(base + "/study?objectiveId=" + id);
    await button("Valider ce passage terminé").click();
    await page
      .getByText(
        "Séance validée. Votre calendrier et votre progression sont actualisés.",
        { exact: true },
      )
      .waitFor();
  }
  await page.goto(base);
  await page
    .getByText("5 objectifs parcourus sur 18", { exact: true })
    .waitFor();
  saved = await snapshot();
  assert.equal(
    Object.values(saved.progress).filter((p) => p.initialCompletedOn).length,
    5,
  );
  await page.goto(base + "/progress");
  await page.getByText("5 / 18 objectifs parcourus", { exact: true }).waitFor();
  console.log("Avance de cinq objectifs et cohérence progression : OK");
  await page.goto(base + "/study?objectiveId=cardio-1&kind=review");
  await button("À revoir").click();
  await button("Valider ce passage terminé").click();
  await page
    .getByText(
      "Séance validée. Votre calendrier et votre progression sont actualisés.",
      { exact: true },
    )
    .waitFor();
  saved = await snapshot();
  assert.equal(saved.progress["cardio-1"].status, "fragile");
  await page.goto(base + "/item?id=cardio");
  await button("Mes annotations").click();
  await page.getByLabel("Annotation personnelle").fill("Ma note persistante");
  await button("Enregistrer mon annotation").click();
  await button("Annotation enregistrée").waitFor();
  await page.reload();
  await button("Mes annotations").click();
  assert.equal(
    await page.getByLabel("Annotation personnelle").inputValue(),
    "Ma note persistante",
  );
  console.log("Rappel actif et annotation persistante : OK");
  await page.goto(base + "/profile");
  await button("Disponibilités et dates").click();
  await button("J’ai une date officielle publiée").click();
  await page
    .getByLabel("Date officielle du concours", { exact: true })
    .fill("2028-10-10");
  await page
    .getByLabel("Source de la date officielle")
    .fill("https://example.org/publication-test");
  await button("Enregistrer et recalculer").click();
  await button("Disponibilités et dates").waitFor();
  saved = await snapshot();
  assert.equal(saved.profile.examDate.official.date, "2028-10-10");
  assert.equal(saved.profile.firstPassTarget, "2028-09-10");
  assert.equal(
    Object.values(saved.progress).filter((p) => p.initialCompletedOn).length,
    5,
  );
  console.log(
    "Transition date provisoire/officielle sans perte : OK (date de test)",
  );
  for (const route of [
    "/calendar",
    "/library",
    "/practice",
    "/coach",
    "/podcasts",
    "/errors",
    "/progress",
    "/profile",
  ]) {
    await page.goto(base + route);
    await page.waitForTimeout(150);
    assert.equal(
      await page.getByText("Unmatched Route", { exact: true }).count(),
      0,
    );
  }
  for (const [name, width, height] of [
    ["mobile", 390, 844],
    ["tablet", 820, 1180],
    ["desktop", 1440, 1100],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    await page.getByText("Bonjour Aurore,", { exact: true }).waitFor();
    await page.waitForTimeout(350);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: path.join(os.tmpdir(), "norya-mission2-" + name + ".png"),
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "Navigation, formats téléphone/tablette/bureau : OK ; aucune erreur JavaScript",
  );
  await context.close();
  server.close();
})().catch(async (e) => {
  console.error(e);
  if (context) await context.close();
  server.close();
  process.exitCode = 1;
});
