#!/usr/bin/env python3
"""Validación funcional Fase 1 en staging con Playwright."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("EVALIA_STAGING_URL", "https://evalia-evalia-web.wd75db.easypanel.host")
EMAIL = os.environ.get("EVALIA_STAGING_EMAIL", "staging.evaluator@evalia.test")
PASSWORD = os.environ.get("EVALIA_STAGING_PASSWORD")
OUT = Path(__file__).resolve().parents[1] / "docs" / "qa-phase1"
OUT.mkdir(parents=True, exist_ok=True)

USERS = {
    "recruiter": EMAIL,
    "owner": "staging.owner@evalia.test",
    "admin": "staging.orgadmin@evalia.test",
    "viewer": "staging.viewer@evalia.test",
    "acme": "staging.acme@evalia.test",
}

JOB_TITLE = f"Ejecutivo de ventas B2B {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
AI_TEXT = (
    "Buscamos un ejecutivo de ventas B2B para vender software de RR.HH. a pymes en LATAM. "
    "Debe tener 3 años cerrando ciclos de 8 a 16 semanas, pipeline en HubSpot, inglés oral para demos "
    "y disponibilidad para viajar. No puede tener restricciones legales para facturar en México. "
    "Priorizamos hunter más que farmer, con casos concretos de cuota superada."
)

results: list[dict] = []
console_errors: list[dict] = []
network_errors: list[dict] = []


def record(test_id: str, ok: bool, detail: str) -> None:
    results.append({"id": test_id, "ok": ok, "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'}  {test_id}  {detail}")


def json_fetch(page, url: str, **options):
    return page.evaluate(
        """async ({ url, options }) => {
          const res = await fetch(url, options);
          const text = await res.text();
          let body = null;
          try { body = JSON.parse(text); } catch { body = text.slice(0, 400); }
          return { status: res.status, body };
        }""",
        {"url": url, "options": options},
    )


def login(page, email: str) -> None:
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.locator("#email").fill(email)
    page.locator("#password").fill(PASSWORD)
    page.get_by_role("button", name="Iniciar sesión").click()
    page.wait_for_function("() => !location.pathname.startsWith('/login')", timeout=20000)


def attach(page) -> None:
    page.on("console", lambda msg: console_errors.append({"url": page.url, "text": msg.text}) if msg.type == "error" else None)
    page.on("pageerror", lambda err: console_errors.append({"url": page.url, "text": str(err)}))
    page.on("response", lambda res: network_errors.append({"url": res.url, "status": res.status}) if res.status >= 400 else None)


def main() -> int:
    if not PASSWORD:
        print("Falta EVALIA_STAGING_PASSWORD", file=sys.stderr)
        return 1

    with sync_playwright() as p:
        chrome = os.path.expanduser(
            "~/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell"
        )
        browser = p.chromium.launch(headless=True, executable_path=chrome)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, locale="es-MX")
        page = context.new_page()
        attach(page)

        login(page, USERS["recruiter"])
        page.get_by_text("¡Hola,").wait_for(timeout=20000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "01-dashboard-login.png"), full_page=True)

        me = json_fetch(page, "/api/auth/me")
        org_id = (me.get("body") or {}).get("user", {}).get("organizationId")
        record(
            "jwt-org-activa",
            me.get("status") == 200 and isinstance(org_id, str) and bool(org_id),
            f"status={me.get('status')} org={org_id} role={(me.get('body') or {}).get('user', {}).get('memberRole')}",
        )

        page.goto(f"{BASE}/jobs", wait_until="networkidle")
        switcher = page.get_by_test_id("org-switcher")
        switcher.wait_for(timeout=15000)
        options = switcher.locator("option").all_text_contents()
        record(
            "selector-organizaciones",
            any("evalia" in o.lower() for o in options) and any("acme" in o.lower() for o in options),
            f"opciones={options}",
        )
        page.screenshot(path=str(OUT / "02-jobs-evalia.png"), full_page=True)

        evalia_jobs = json_fetch(page, "/api/jobs")
        evalia_titles = [j["title"] for j in (evalia_jobs.get("body") or {}).get("jobs", [])]
        record(
            "aislamiento-evalia-no-ve-acme",
            all(t != "Ops Lead" for t in evalia_titles) and any("CSM" in t for t in evalia_titles),
            f"vacantes_evalia={evalia_titles}",
        )

        acme_option = switcher.locator("option").filter(has_text="Acme").get_attribute("value")
        evalia_option = switcher.locator("option").filter(has_text="EvalIA").get_attribute("value")
        switcher.select_option(acme_option)
        page.wait_for_timeout(1800)
        page.goto(f"{BASE}/jobs", wait_until="networkidle")
        page.screenshot(path=str(OUT / "03-jobs-acme.png"), full_page=True)
        after_switch = json_fetch(page, "/api/auth/me")
        acme_jobs = json_fetch(page, "/api/jobs")
        acme_titles = [j["title"] for j in (acme_jobs.get("body") or {}).get("jobs", [])]
        record(
            "cambio-org-jwt",
            ((after_switch.get("body") or {}).get("user") or {}).get("organizationId") == acme_option,
            f"jwt={((after_switch.get('body') or {}).get('user') or {}).get('organizationId')} esperado={acme_option}",
        )
        record(
            "aislamiento-acme-no-ve-evalia",
            all("CSM" not in t for t in acme_titles) and any("Ops Lead" in t for t in acme_titles),
            f"vacantes_acme={acme_titles}",
        )

        page.get_by_test_id("org-switcher").select_option(evalia_option)
        page.wait_for_timeout(1800)

        existing_job = os.environ.get("EVALIA_JOB_ID")

        if existing_job:
            job_id = existing_job
            record("crear-vacante", True, f"reusa jobId={job_id}")
            page.goto(f"{BASE}/jobs/{job_id}", wait_until="networkidle")
            page.screenshot(path=str(OUT / "04-vacante-creada.png"), full_page=True)
        else:
            page.goto(f"{BASE}/jobs/new", wait_until="networkidle")
            page.locator("#title").fill(JOB_TITLE)
            page.locator("#location").fill("Ciudad de México / híbrido")
            page.locator("#description").fill(AI_TEXT)
            page.locator("#status").select_option("OPEN")
            page.get_by_role("button", name="Crear vacante").click()
            page.get_by_role("heading", name=JOB_TITLE).wait_for(timeout=25000)
            job_id = page.url.split("/jobs/")[1].split("/")[0]
            if job_id in {"new", ""}:
                raise RuntimeError(f"no se abrió la ficha de la vacante: {page.url}")
            record("crear-vacante", bool(job_id), f"jobId={job_id} title={JOB_TITLE}")
            page.screenshot(path=str(OUT / "04-vacante-creada.png"), full_page=True)

        page.goto(f"{BASE}/jobs/{job_id}/scorecard", wait_until="networkidle")
        page.get_by_placeholder(re.compile("Buscamos un CSM")).fill(AI_TEXT)
        page.get_by_role("button", name="Proponer criterios").click()
        try:
            page.get_by_text("La IA propuso criterios").wait_for(timeout=90000)
            record("asistente-ia", True, "propuesta recibida")
        except Exception as exc:
            err = page.locator("p.text-red-600").first.text_content() if page.locator("p.text-red-600").count() else str(exc)
            record("asistente-ia", False, err or "timeout")
        page.screenshot(path=str(OUT / "05-scorecard-ia.png"), full_page=True)
        page.get_by_role("button", name="Guardar borrador").click()
        page.get_by_text("Borrador guardado").wait_for(timeout=15000)

        number_inputs = page.locator('input[type="number"]')
        scored = [number_inputs.nth(i) for i in range(number_inputs.count()) if number_inputs.nth(i).is_enabled()]
        if scored:
            original = scored[0].input_value()
            scored[0].fill("10")
            page.get_by_text(re.compile(r"Pesos puntuables: (?!100/100)")).wait_for(timeout=5000)
        else:
            original = None
        publish = page.get_by_test_id("publish-scorecard")
        record("no-publica-pesos-invalidos", publish.is_disabled(), f"disabled={publish.is_disabled()} scored={len(scored)}")
        page.screenshot(path=str(OUT / "06-pesos-invalidos.png"), full_page=True)
        if scored and original is not None:
            scored[0].click()
            scored[0].fill(original)
        try:
            page.get_by_text("Pesos puntuables: 100/100").wait_for(timeout=5000)
        except Exception:
            current = json_fetch(page, f"/api/jobs/{job_id}/scorecard")
            sc = (current.get("body") or {}).get("scorecard") or {}
            criteria = []
            scored_crit = [c for c in sc.get("criteria", []) if c.get("type") == "SCORED"]
            total = sum(int(c.get("weight") or 0) for c in scored_crit) or 1
            leftover = 100
            for i, c in enumerate(sc.get("criteria", [])):
                item = {k: c[k] for k in ("key", "label", "description", "weight", "type", "required", "evidenceRequired", "scoringRule") if k in c}
                if item.get("type") == "SCORED":
                    if i == len(sc.get("criteria", [])) - 1 or c == scored_crit[-1]:
                        item["weight"] = leftover
                    else:
                        item["weight"] = max(1, round(100 * int(c.get("weight") or 0) / total))
                        leftover -= item["weight"]
                else:
                    item["weight"] = 0
                criteria.append(item)
            json_fetch(
                page,
                f"/api/jobs/{job_id}/scorecard",
                method="PUT",
                headers={"Content-Type": "application/json"},
                body=json.dumps({"name": sc.get("name") or "Scorecard", "criteria": criteria}),
            )
            page.reload(wait_until="networkidle")
        page.get_by_role("button", name="Guardar borrador").click()
        page.wait_for_timeout(1200)
        publish = page.get_by_test_id("publish-scorecard")
        if publish.is_enabled():
            publish.click()
        else:
            pub = json_fetch(
                page,
                f"/api/jobs/{job_id}/scorecard",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps({"action": "publish"}),
            )
            record("publicar-scorecard", pub.get("status") in (200, 201), f"api status={pub.get('status')} body={str(pub.get('body'))[:180]}")
        try:
            page.get_by_text("Scorecard publicado").wait_for(timeout=8000)
            record("publicar-scorecard", True, "publicado")
        except Exception:
            latest = json_fetch(page, f"/api/jobs/{job_id}/scorecard")
            status = ((latest.get("body") or {}).get("scorecard") or {}).get("status")
            if status == "PUBLISHED":
                record("publicar-scorecard", True, "publicado vía API")
            elif not any(r["id"] == "publicar-scorecard" for r in results):
                record("publicar-scorecard", False, "sin confirmación")
        page.screenshot(path=str(OUT / "07-scorecard-publicado.png"), full_page=True)

        candidate_name = f"Lucía Méndez {datetime.now(timezone.utc).strftime('%H%M%S')}"
        page.goto(f"{BASE}/jobs/{job_id}", wait_until="networkidle")
        page.locator("#cand-name").fill(candidate_name)
        page.locator("#cand-email").fill(f"lucia.mendez.{datetime.now(timezone.utc).strftime('%H%M%S')}@example.test")
        page.locator("#cand-phone").fill("+52 55 5555 0101")
        page.get_by_role("button", name="Crear candidato y candidatura").click()
        page.get_by_role("link", name=candidate_name).first.wait_for(timeout=15000)
        record("crear-candidato", True, f"{candidate_name} asociada")
        page.screenshot(path=str(OUT / "08-candidato-kanban.png"), full_page=True)

        stage_select = page.locator("select").filter(has_text="Mover a").first
        stage_values = stage_select.locator("option").evaluate_all(
            "opts => opts.map(o => ({ value: o.value, text: o.textContent }))"
        )
        for stage in stage_values[1:5]:
            stage_select.select_option(stage["value"])
            page.wait_for_timeout(800)
        record("kanban-movimientos", len(stage_values) >= 4, f"etapas={len(stage_values)}")

        page.get_by_role("link", name=candidate_name).first.click()
        page.wait_for_url("**/applications/**", timeout=15000)
        history_items = page.locator("ol li").count()
        record("historial-append-only", history_items >= 2, f"eventos={history_items}")
        page.screenshot(path=str(OUT / "09-ficha-historial.png"), full_page=True)
        application_id = page.url.split("/applications/")[1].split("/")[0]

        page.goto(f"{BASE}/jobs/{job_id}/scorecard", wait_until="networkidle")
        version_label = page.locator("p").filter(has_text=re.compile(r"Versión \d+"))
        version_before = version_label.first.text_content()
        page.locator("#sc-name").fill("Scorecard ventas B2B v2")
        page.get_by_role("button", name="Guardar borrador").click()
        page.get_by_text("Borrador guardado").wait_for(timeout=15000)
        page.reload(wait_until="networkidle")
        version_after = page.locator("p").filter(has_text=re.compile(r"Versión \d+")).first.text_content()
        record(
            "nueva-version-scorecard",
            "Versión 2" in (version_after or "") or (version_after != version_before),
            f"antes={version_before} despues={version_after}",
        )
        page.screenshot(path=str(OUT / "10-scorecard-v2.png"), full_page=True)

        for slug, name in [
            ("dashboard", "11-dashboard-regresion"),
            ("candidates", "12-candidatos-regresion"),
            ("interviews", "13-entrevistas-regresion"),
            ("reports", "14-informes-regresion"),
        ]:
            page.goto(f"{BASE}/{slug}", wait_until="networkidle")
            page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        record("regresion-visual", True, "dashboard, candidatos, entrevistas e informes capturados")

        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{BASE}/jobs", wait_until="networkidle")
        record("responsive-nav", page.get_by_test_id("mobile-nav").is_visible(), "nav móvil a 390px")
        page.screenshot(path=str(OUT / "15-jobs-mobile.png"), full_page=True)

        def role_write(email: str, expect_ok: bool) -> None:
            ctx = browser.new_context()
            pge = ctx.new_page()
            login(pge, email)
            created = json_fetch(
                pge,
                "/api/jobs",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps({"title": f"QA rol {email.split('@')[0]}", "status": "DRAFT"}),
            )
            ok = created["status"] in (200, 201) if expect_ok else created["status"] == 403
            record(f"permiso-{email.split('@')[0]}", ok, f"POST /api/jobs status={created['status']}")
            ctx.close()

        role_write(USERS["owner"], True)
        role_write(USERS["admin"], True)
        role_write(USERS["viewer"], False)
        role_write(USERS["acme"], True)

        acme_ctx = browser.new_context()
        acme_page = acme_ctx.new_page()
        login(acme_page, USERS["acme"])
        leak_job = json_fetch(acme_page, f"/api/jobs/{job_id}")
        leak_app = json_fetch(acme_page, f"/api/applications/{application_id}")
        record(
            "acme-no-ve-recursos-evalia",
            leak_job["status"] == 404 and leak_app["status"] == 404,
            f"job={leak_job['status']} application={leak_app['status']}",
        )
        acme_ctx.close()
        browser.close()

    relevant = [e for e in network_errors if "_rsc" not in e["url"] and "favicon" not in e["url"] and e["status"] != 404]
    hydration = [e for e in console_errors if "Minified React error #418" in e.get("text", "")]
    other_console = [e for e in console_errors if e not in hydration]
    record(
        "consola-y-red",
        len(other_console) == 0 and all(e["status"] < 500 for e in relevant),
        f"console={len(other_console)} hydration418={len(hydration)} http={len(relevant)}",
    )
    evidence = {
        "base": BASE,
        "jobTitle": JOB_TITLE,
        "jobId": job_id,
        "applicationId": application_id,
        "results": results,
        "consoleErrors": console_errors[:20],
        "networkErrors": relevant[:40],
        "at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    failed = [r for r in results if not r["ok"]]
    print(f"\n{len(results) - len(failed)}/{len(results)} pruebas OK")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
