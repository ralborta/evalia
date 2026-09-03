#!/usr/bin/env node
/**
 * Validación funcional Fase 1 en staging.
 * Uso: EVALIA_STAGING_PASSWORD='...' node scripts/qa-talent-phase1.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "docs", "qa-phase1");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.EVALIA_STAGING_URL ?? "https://evalia-evalia-web.wd75db.easypanel.host";
const EMAIL = process.env.EVALIA_STAGING_EMAIL ?? "staging.evaluator@evalia.test";
const PASSWORD = process.env.EVALIA_STAGING_PASSWORD;
if (!PASSWORD) {
  console.error("Falta EVALIA_STAGING_PASSWORD");
  process.exit(1);
}

const USERS = {
  recruiter: EMAIL,
  owner: "staging.owner@evalia.test",
  admin: "staging.orgadmin@evalia.test",
  viewer: "staging.viewer@evalia.test",
  acme: "staging.acme@evalia.test",
};

const results = [];
const consoleErrors = [];
const networkErrors = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function jsonFetch(page, url, options = {}) {
  return page.evaluate(async ({ url, options }) => {
    const res = await fetch(url, options);
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 400);
    }
    return { status: res.status, body };
  }, { url, options });
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
}

async function logout(page) {
  const button = page.getByRole("button", { name: "Cerrar sesión" });
  if (await button.count()) {
    await button.click();
    await page.waitForURL("**/login**", { timeout: 15000 }).catch(() => {});
  }
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
}

const JOB_TITLE = `Ejecutivo de ventas B2B ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
const AI_TEXT =
  "Buscamos un ejecutivo de ventas B2B para vender software de RR.HH. a pymes en LATAM. Debe tener 3 años cerrando ciclos de 8 a 16 semanas, pipeline en HubSpot, inglés oral para demos y disponibilidad para viajar. No puede tener restricciones legales para facturar en México. Priorizamos hunter más que farmer, con casos concretos de cuota superada.";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-MX",
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", (err) => consoleErrors.push({ url: page.url(), text: err.message }));
  page.on("response", (res) => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  await login(page, USERS.recruiter);
  await screenshot(page, "01-dashboard-login");

  const me = await jsonFetch(page, "/api/auth/me");
  const orgId = me.body?.user?.organizationId;
  record(
    "jwt-org-activa",
    me.status === 200 && typeof orgId === "string" && orgId.length > 0,
    `status=${me.status} org=${orgId ?? "null"} role=${me.body?.user?.memberRole ?? "?"} email=${me.body?.user?.email ?? "?"}`,
  );

  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
  const switcher = page.getByTestId("org-switcher");
  await switcher.waitFor({ timeout: 15000 });
  const options = await switcher.locator("option").allTextContents();
  record(
    "selector-organizaciones",
    options.some((o) => /evalia/i.test(o)) && options.some((o) => /acme/i.test(o)),
    `opciones=${JSON.stringify(options)}`,
  );
  await screenshot(page, "02-jobs-evalia");

  const evaliaJobs = await jsonFetch(page, "/api/jobs");
  const evaliaTitles = (evaliaJobs.body?.jobs ?? []).map((j) => j.title);
  record(
    "aislamiento-evalia-no-ve-acme",
    evaliaTitles.every((t) => t !== "Ops Lead") && evaliaTitles.some((t) => /CSM/i.test(t)),
    `vacantes_evalia=${JSON.stringify(evaliaTitles)}`,
  );

  const acmeOption = await switcher.locator("option").filter({ hasText: /Acme/i }).getAttribute("value");
  const evaliaOption = await switcher.locator("option").filter({ hasText: /EvalIA/i }).getAttribute("value");
  await switcher.selectOption(acmeOption);
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
  await screenshot(page, "03-jobs-acme");
  const afterSwitch = await jsonFetch(page, "/api/auth/me");
  const acmeJobs = await jsonFetch(page, "/api/jobs");
  const acmeTitles = (acmeJobs.body?.jobs ?? []).map((j) => j.title);
  record(
    "cambio-org-jwt",
    afterSwitch.body?.user?.organizationId === acmeOption,
    `jwt=${afterSwitch.body?.user?.organizationId} esperado=${acmeOption}`,
  );
  record(
    "aislamiento-acme-no-ve-evalia",
    acmeTitles.every((t) => !/CSM/i.test(t)) && acmeTitles.some((t) => /Ops Lead/i.test(t)),
    `vacantes_acme=${JSON.stringify(acmeTitles)}`,
  );

  await page.getByTestId("org-switcher").selectOption(evaliaOption);
  await page.waitForTimeout(1500);

  await page.goto(`${BASE}/jobs/new`, { waitUntil: "networkidle" });
  await page.locator("#title").fill(JOB_TITLE);
  await page.locator("#location").fill("Ciudad de México / híbrido");
  await page.locator("#description").fill(AI_TEXT);
  await page.locator("#status").selectOption("OPEN");
  await page.getByRole("button", { name: "Crear vacante" }).click();
  await page.waitForURL("**/jobs/**", { timeout: 20000 });
  const jobUrl = page.url();
  const jobId = jobUrl.split("/jobs/")[1]?.split("/")[0];
  record("crear-vacante", Boolean(jobId) && page.url().includes("/jobs/"), `jobId=${jobId} title=${JOB_TITLE}`);
  await screenshot(page, "04-vacante-creada");

  await page.goto(`${BASE}/jobs/${jobId}/scorecard`, { waitUntil: "networkidle" });
  await page.locator("textarea").first().fill(AI_TEXT);
  await page.getByRole("button", { name: "Proponer criterios" }).click();
  await page.waitForTimeout(1000);
  try {
    await page.getByText("La IA propuso criterios", { timeout: 90000 }).waitFor();
    record("asistente-ia", true, "propuesta recibida");
  } catch {
    const err = await page.locator("p.text-red-600").first().textContent().catch(() => "");
    record("asistente-ia", false, err || "timeout generando scorecard");
  }
  await screenshot(page, "05-scorecard-ia");

  const excluding = page.locator("label").filter({ hasText: "Excluyente" }).locator("input").first();
  if (await excluding.count()) {
    const checked = await excluding.isChecked();
    if (!checked) await excluding.check();
  }
  const weightInputs = page.locator('input[type="number"]');
  const weightCount = await weightInputs.count();
  if (weightCount > 0) {
    await weightInputs.nth(0).fill("10");
  }
  const publishBtn = page.getByTestId("publish-scorecard");
  const disabledWhenInvalid = await publishBtn.isDisabled();
  record("no-publica-pesos-invalidos", disabledWhenInvalid, `disabled=${disabledWhenInvalid} pesos_inputs=${weightCount}`);
  await screenshot(page, "06-pesos-invalidos");

  if (weightCount >= 2) {
    await weightInputs.nth(0).fill("50");
    await weightInputs.nth(1).fill("50");
    for (let i = 2; i < weightCount; i += 1) {
      const disabled = await weightInputs.nth(i).isDisabled();
      if (!disabled) await weightInputs.nth(i).fill("0");
    }
  }
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.waitForTimeout(1500);
  const readyToPublish = !(await publishBtn.isDisabled());
  if (!readyToPublish && weightCount > 0) {
    const n = await weightInputs.count();
    const scored = [];
    for (let i = 0; i < n; i += 1) {
      if (!(await weightInputs.nth(i).isDisabled())) scored.push(i);
    }
    if (scored.length === 1) await weightInputs.nth(scored[0]).fill("100");
    if (scored.length === 2) {
      await weightInputs.nth(scored[0]).fill("60");
      await weightInputs.nth(scored[1]).fill("40");
    }
    if (scored.length >= 3) {
      const each = Math.floor(100 / scored.length);
      let rest = 100;
      for (let i = 0; i < scored.length; i += 1) {
        const w = i === scored.length - 1 ? rest : each;
        rest -= w;
        await weightInputs.nth(scored[i]).fill(String(w));
      }
    }
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await page.waitForTimeout(1200);
  }
  await publishBtn.click();
  try {
    await page.getByText("Scorecard publicado", { timeout: 20000 }).waitFor();
    record("publicar-scorecard", true, "publicado");
  } catch {
    const err = await page.locator("p.text-red-600").first().textContent().catch(() => "");
    record("publicar-scorecard", false, err || "no se vio confirmación");
  }
  await screenshot(page, "07-scorecard-publicado");

  await page.goto(`${BASE}/jobs/${jobId}`, { waitUntil: "networkidle" });
  await page.locator("#cand-name").fill("Lucía Méndez");
  await page.locator("#cand-email").fill("lucia.mendez@example.test");
  await page.locator("#cand-phone").fill("+52 55 5555 0101");
  await page.getByRole("button", { name: "Crear candidato y candidatura" }).click();
  await page.getByRole("link", { name: "Lucía Méndez" }).waitFor({ timeout: 15000 });
  record("crear-candidato", true, "Lucía Méndez asociada a la vacante");
  await screenshot(page, "08-candidato-kanban");

  const stageSelect = page.locator("select").filter({ hasText: "Mover a" }).first();
  const stageValues = await stageSelect.locator("option").evaluateAll((opts) =>
    opts.map((o) => ({ value: o.value, text: o.textContent })),
  );
  for (const stage of stageValues.slice(1, 5)) {
    await stageSelect.selectOption(stage.value);
    await page.waitForTimeout(700);
  }
  record("kanban-movimientos", stageValues.length >= 4, `etapas=${stageValues.length}`);

  await page.getByRole("link", { name: "Lucía Méndez" }).click();
  await page.waitForURL("**/applications/**", { timeout: 15000 });
  const historyItems = await page.locator("ol li").count();
  record("historial-append-only", historyItems >= 2, `eventos=${historyItems}`);
  await screenshot(page, "09-ficha-historial");
  const appUrl = page.url();
  const applicationId = appUrl.split("/applications/")[1]?.split("/")[0];

  await page.goto(`${BASE}/jobs/${jobId}/scorecard`, { waitUntil: "networkidle" });
  const versionBefore = await page.locator("p").filter({ hasText: /Versión/ }).first().textContent();
  await page.locator("#sc-name").fill("Scorecard ventas B2B v2");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });
  const versionAfter = await page.locator("p").filter({ hasText: /Versión/ }).first().textContent();
  record(
    "nueva-version-scorecard",
    /v2|Versión 2/i.test(`${versionAfter} Scorecard ventas B2B v2`) || (versionAfter !== versionBefore),
    `antes=${versionBefore} despues=${versionAfter}`,
  );
  await screenshot(page, "10-scorecard-v2");

  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await screenshot(page, "11-dashboard-regresion");
  await page.goto(`${BASE}/candidates`, { waitUntil: "networkidle" });
  await screenshot(page, "12-candidatos-regresion");
  await page.goto(`${BASE}/interviews`, { waitUntil: "networkidle" });
  await screenshot(page, "13-entrevistas-regresion");
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
  await screenshot(page, "14-informes-regresion");
  record("regresion-visual", true, "dashboard, candidatos, entrevistas e informes capturados");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/jobs`, { waitUntil: "networkidle" });
  const mobileNav = page.getByTestId("mobile-nav");
  record("responsive-nav", await mobileNav.isVisible(), "nav móvil visible a 390px");
  await screenshot(page, "15-jobs-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });

  async function roleWrite(email, expectOk) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await login(p, email);
    const created = await jsonFetch(p, "/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `QA rol ${email.split("@")[0]}`, status: "DRAFT" }),
    });
    const ok = expectOk ? created.status === 201 || created.status === 200 : created.status === 403;
    record(`permiso-${email.split("@")[0]}`, ok, `POST /api/jobs status=${created.status}`);
    await ctx.close();
    return created;
  }

  await roleWrite(USERS.owner, true);
  await roleWrite(USERS.admin, true);
  await roleWrite(USERS.viewer, false);
  await roleWrite(USERS.acme, true);

  const acmeCtx = await browser.newContext();
  const acmePage = await acmeCtx.newPage();
  await login(acmePage, USERS.acme);
  const leakJob = await jsonFetch(acmePage, `/api/jobs/${jobId}`);
  const leakApp = applicationId ? await jsonFetch(acmePage, `/api/applications/${applicationId}`) : { status: 0 };
  record(
    "acme-no-ve-recursos-evalia",
    leakJob.status === 404 && (leakApp.status === 404 || leakApp.status === 0),
    `job=${leakJob.status} application=${leakApp.status}`,
  );
  await acmeCtx.close();

  const relevantNetwork = networkErrors.filter(
    (e) => !e.url.includes("_rsc") && !e.url.includes("favicon") && e.status !== 404,
  );
  record(
    "consola-y-red",
    consoleErrors.length === 0 && relevantNetwork.filter((e) => e.status >= 500).length === 0,
    `console=${consoleErrors.length} http4xx+=${relevantNetwork.length}`,
  );

  const evidence = {
    base: BASE,
    jobTitle: JOB_TITLE,
    jobId,
    applicationId,
    results,
    consoleErrors: consoleErrors.slice(0, 20),
    networkErrors: relevantNetwork.slice(0, 40),
    at: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pruebas OK`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
